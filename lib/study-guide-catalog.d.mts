export type StudyGuide={id:string;title:string;category:string;description:string;file_url:string;number:string;volume:number;page_count:number};
export type BundledStudyGuide=StudyGuide&{slug:string;filename:string;download_filename:string;size:number;sha256:string};
export const studyGuideCatalog:BundledStudyGuide[];
export const studyGuideVolumes:{id:number;title:string}[];
export const studyGuideBucket:string;
export function filterStudyGuides(guides:StudyGuide[],category?:string,query?:string):StudyGuide[];
