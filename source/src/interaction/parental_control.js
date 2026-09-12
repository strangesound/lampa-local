// Content is never gated by age, profile or a parental PIN in this edition.
export default {
    init() {},
    enabled() { return false },
    query(call) { if(call) call() },
    personal(name, call) { if(call) call() },
    install(call) { if(call) call(false) },
    add() {}
}
