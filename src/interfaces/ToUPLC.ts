import { UPLCTerm } from "../UPLCTerm/UPLCTerm";

export interface ToUPLC {
    toUPLC: ( dbn?: number | bigint ) => UPLCTerm
}