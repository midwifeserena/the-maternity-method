export type StudyGuide={id:string;title:string;category:string;categories?:string[];search_terms?:string[];description:string;file_url:string;page_count?:number;draft?:boolean};
export type BundledStudyGuide=StudyGuide&{slug:string;filename:string;download_filename:string;page_count:number};
export const studyGuideCatalog:BundledStudyGuide[];
export function filterStudyGuides(guides:StudyGuide[],category?:string,query?:string):StudyGuide[];
