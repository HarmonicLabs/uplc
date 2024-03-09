
export enum UPLCTermTag {
    Var = 0,
    Delay = 1,
    Lambda = 2,
    Application = 3,
    Const = 4,
    Force = 5,
    Error = 6,
    Builtin = 7,
    Constr = 8,
    Case = 9
}

Object.freeze( UPLCTermTag );