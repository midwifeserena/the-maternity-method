export type Category='Antepartum'|'Intrapartum'|'Postpartum'|'Newborn';
export type Question={id:string;category:Category;type:'single'|'sata'|'matrix';stem:string;options:{id:string;label:string}[];matrix_rows?:{id:string;label:string}[];chart?:Record<string,string>;points?:number};
export const categories:Category[]=['Antepartum','Intrapartum','Postpartum','Newborn'];
