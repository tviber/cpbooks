#include <clang/AST/RecursiveASTVisitor.h>
#include <clang/AST/ParentMapContext.h>
#include <clang/ASTMatchers/ASTMatchFinder.h>
#include <clang/Frontend/CompilerInstance.h>
#include <clang/Rewrite/Core/Rewriter.h>
#include <clang/Tooling/CompilationDatabase.h>
#include <clang/Tooling/Tooling.h>

using namespace clang;
using namespace clang::ast_matchers;

// Match declaration identities, then account for *every* reference to tracked
// storage. Unrecognised uses (aliasing, bulk writes, etc.) fail the whole run.
class Instrument : public RecursiveASTVisitor<Instrument> {
    ASTContext& ctx;
    Rewriter& rw;
    const FunctionDecl* fn;
    const VarDecl* queue = nullptr;

    template<class T> const T* parent(const Stmt* s) {
        auto parents = ctx.getParents(*s);
        return parents.size() == 1 ? parents[0].get<T>() : nullptr;
    }
    unsigned line(SourceLocation loc) { return ctx.getSourceManager().getSpellingLineNumber(loc); }
    void reject(SourceLocation loc, llvm::StringRef reason) {
        auto& diag = ctx.getDiagnostics();
        diag.Report(loc, diag.getCustomDiagID(DiagnosticsEngine::Error, "unsupported: %0")) << reason;
    }
    bool plain(SourceRange r) { return r.getBegin().isFileID() && r.getEnd().isFileID(); }
    bool member(DeclRefExpr* ref, bool isQueue) {
        const Stmt* base = ref;
        if (auto cast = parent<ImplicitCastExpr>(base)) base = cast;
        auto field = parent<MemberExpr>(base);
        if (!field || !plain(field->getSourceRange())) return false;
        auto call = parent<CXXMemberCallExpr>(field);
        if (!call || !call->getMethodDecl()) return false;
        auto name = call->getMethodDecl()->getNameAsString();
        if (name == "size" || name == "empty") return true;
        if (!isQueue || (name != "push" && name != "pop" && name != "top" && name != "emplace")) return false;
        if (name == "emplace" && (call->getNumArgs() != 2 || !call->getArg(0)->getType()->isIntegerType() || !call->getArg(1)->getType()->isIntegerType())) return false;
        rw.ReplaceText(ref->getSourceRange(), "::cpbooks::observe(" + queue->getNameAsString() + "," + std::to_string(line(ref->getLocation())) + ")");
        return true;
    }
    bool array(DeclRefExpr* ref, bool distance) {
        auto sub = parent<CXXOperatorCallExpr>(ref);
        if (!sub || sub->getOperator() != OO_Subscript || sub->getArg(0) != ref || !plain(sub->getSourceRange())) return false;
        auto cast = parent<ImplicitCastExpr>(sub);
        if (cast && cast->getCastKind() == CK_LValueToRValue) return true;
        auto pair = parent<CXXConstructExpr>(sub);
        if (pair && pair->getType().getCanonicalType().getAsString() == "struct std::pair<int, int>") return true;
        auto call = parent<CXXMemberCallExpr>(sub);
        if (call && call->getMethodDecl() && call->getMethodDecl()->getNameAsString() == "emplace") {
            auto base = dyn_cast<DeclRefExpr>(call->getImplicitObjectArgument()->IgnoreParenImpCasts());
            if (base && base->getDecl() == queue) return true;
        }
        auto assign = parent<BinaryOperator>(sub);
        if (!assign || assign->getOpcode() != BO_Assign || assign->getLHS() != sub) return false;
        // Slot assignment is a statement, not a replacement for an lvalue result.
        if (!parent<CompoundStmt>(assign) && !parent<IfStmt>(assign) && !parent<ForStmt>(assign) && !parent<WhileStmt>(assign)) return false;
        // Replace only the two brackets and the base. Nested RHS/index reads retain their ranges.
        auto index = sub->getArg(1)->getBeginLoc();
        if (!index.isFileID()) return false;
        auto prefix = "::cpbooks::Slot{" + ref->getDecl()->getNameAsString() + ",static_cast<std::size_t>(";
        rw.ReplaceText(CharSourceRange::getCharRange(ref->getBeginLoc(), index), prefix);
        rw.ReplaceText(sub->getEndLoc(), 1, ")," + std::to_string(line(ref->getLocation())) + (distance ? ",\"distance.write\"}" : ",\"parent.write\"}"));
        return true;
    }
public:
    Instrument(ASTContext& c, Rewriter& r, const FunctionDecl* f) : ctx(c), rw(r), fn(f) {}
    bool VisitVarDecl(VarDecl* v) {
        auto record = v->getType().getNonReferenceType()->getAsCXXRecordDecl();
        if (!record || record->getQualifiedNameAsString() != "std::priority_queue") return true;
        auto spec = dyn_cast<ClassTemplateSpecializationDecl>(record);
        auto type = spec ? spec->getTemplateArgs()[0].getAsType().getCanonicalType().getAsString() : "";
        const Expr* init = v->getInit();
        if (auto clean = dyn_cast_or_null<ExprWithCleanups>(init)) init = clean->getSubExpr();
        auto ctor = dyn_cast_or_null<CXXConstructExpr>(init);
        auto parents = ctx.getParents(*v);
        auto decl = parents.size() == 1 ? parents[0].get<DeclStmt>() : nullptr;
        if (queue || !decl || parent<CompoundStmt>(decl) != fn->getBody() || !v->hasLocalStorage() ||
            type != "struct std::pair<int, int>" || !ctor || (ctor->getNumArgs() > 1 && !ctor->getArg(1)->isDefaultArgument()) || ctor->getConstructor()->isCopyOrMoveConstructor())
            reject(v->getLocation(), "use one function-local priority_queue<pair<int,int>> constructed empty or with a comparator");
        queue = v;
        return true;
    }
    bool VisitLambdaExpr(LambdaExpr* lambda) {
        for (const auto& capture : lambda->captures()) if (capture.capturesVariable()) {
            auto v = capture.getCapturedVar();
            if (v == queue || v == fn->getParamDecl(2) || v == fn->getParamDecl(3))
                reject(lambda->getBeginLoc(), "capturing tracked storage in a lambda");
        }
        return true;
    }
    bool VisitDeclRefExpr(DeclRefExpr* ref) {
        auto decl = ref->getDecl();
        bool isQueue = decl == queue, distance = decl == fn->getParamDecl(2);
        if (!isQueue && !distance && decl != fn->getParamDecl(3)) return true;
        if (!plain(ref->getSourceRange()) || !(member(ref, isQueue) || (!isQueue && array(ref, distance))))
            reject(ref->getLocation(), "use direct queue operations or vector[index] reads and simple assignments; aliases and bulk mutations cannot be traced");
        return true;
    }
    void run() {
        TraverseStmt(fn->getBody());
        if (!queue) reject(fn->getLocation(), "declare a local std::priority_queue of (distance, node) pairs");
    }
};

class LessonAction : public ASTFrontendAction, public MatchFinder::MatchCallback {
    Rewriter rw;
    MatchFinder finder;
    bool found = false;
    const FunctionDecl* lesson = nullptr;
    std::vector<const CXXMemberCallExpr*> queueCalls;
    std::unique_ptr<ASTConsumer> CreateASTConsumer(CompilerInstance& ci, llvm::StringRef) override {
        rw.setSourceMgr(ci.getSourceManager(), ci.getLangOpts());
        finder.addMatcher(functionDecl(isExpansionInMainFile(), isDefinition(), hasName("::dijkstra")).bind("fn"), this);
        finder.addMatcher(cxxMemberCallExpr(isExpansionInMainFile(), callee(cxxMethodDecl(ofClass(cxxRecordDecl(hasName("::std::priority_queue")))))).bind("queueCall"), this);
        return finder.newASTConsumer();
    }
    void run(const MatchFinder::MatchResult& result) override {
        if (auto call = result.Nodes.getNodeAs<CXXMemberCallExpr>("queueCall")) { queueCalls.push_back(call); return; }
        auto fn = result.Nodes.getNodeAs<FunctionDecl>("fn");
        // Only a definition matching the provided header has that earlier declaration.
        auto& sm = rw.getSourceMgr();
        if (sm.isWrittenInMainFile(fn->getCanonicalDecl()->getLocation()) || fn->getNumParams() != 4) return;
        found = true;
        lesson = fn;
        Instrument(*result.Context, rw, fn).run();
    }
    void EndSourceFileAction() override {
        auto& diag = getCompilerInstance().getDiagnostics();
        for (auto call : queueCalls) {
            // Helpers and global queues must not silently contribute unrecorded operations.
            auto base = dyn_cast<DeclRefExpr>(call->getImplicitObjectArgument()->IgnoreParenImpCasts());
            auto var = base ? dyn_cast<VarDecl>(base->getDecl()) : nullptr;
            if (!var || !lesson || var->getDeclContext() != lesson || call->getBeginLoc().isMacroID())
                diag.Report(call->getBeginLoc(), diag.getCustomDiagID(DiagnosticsEngine::Error, "unsupported: operate directly on the queue in dijkstra"));
        }
        if (!found && !diag.hasErrorOccurred()) diag.Report(diag.getCustomDiagID(DiagnosticsEngine::Error, "unsupported: expected void dijkstra(const Graph&, int, vector<int>&, vector<int>&)"));
        if (!diag.hasErrorOccurred()) rw.getEditBuffer(rw.getSourceMgr().getMainFileID()).write(llvm::outs());
    }
};

int main() {
    tooling::FixedCompilationDatabase db(".", {"-std=c++17", "-D_GLIBCXX_ASSERTIONS", "-include", "/opt/lesson/lesson.hpp"});
    tooling::ClangTool tool(db, {"student.cpp"});
    return tool.run(tooling::newFrontendActionFactory<LessonAction>().get());
}
