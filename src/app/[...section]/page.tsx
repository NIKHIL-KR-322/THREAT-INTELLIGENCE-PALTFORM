import { notFound } from "next/navigation";
const labels:Record<string,string>={};
export default async function Module({params}:{params:Promise<{section:string[]}>}){const {section}=await params;const title=labels[section[0]];if(!title)notFound();return <main className="simple-page"><a className="back" href="/">← Dashboard</a><p className="eyebrow">THREAT INTEL PLATFORM</p><h1>{title}</h1></main>}
