export type Step = boolean
export type Track = { id:string; soundId:string; steps:boolean[]; velocity:number[] }
export type SongState = { bpm:number; tracks:Track[] }
