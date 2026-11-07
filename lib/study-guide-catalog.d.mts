export type StudyGuide={id:string;title:string;category:string;categories?:string[];description:string;file_url:string;draft?:boolean};
export type BundledStudyGuide=StudyGuide&{slug:string;filename:string};
export const studyGuideCatalog:BundledStudyGuide[];
export function mergeStudyGuides(existing?:StudyGuide[]):StudyGuide[];
export function filterStudyGuides(guides:StudyGuide[],category?:string,query?:string):StudyGuide[];
