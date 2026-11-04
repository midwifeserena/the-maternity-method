export type Category='Antepartum'|'Intrapartum'|'Postpartum'|'Newborn';
export type Question={id:string;category:Category;type:'single'|'sata'|'matrix';stem:string;options:{id:string;label:string;images?:{url:string;alt:string}[]}[];matrix_rows?:{id:string;label:string}[];chart?:Record<string,string>;images?:{url:string;alt:string}[];points?:number};
export const categories:Category[]=['Antepartum','Intrapartum','Postpartum','Newborn'];
