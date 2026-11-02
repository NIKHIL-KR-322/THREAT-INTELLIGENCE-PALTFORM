"use client";

import { useEffect, useState } from "react";

type Report = {
  report_id: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  cve_ids: string[];
  source: string;
  is_demo: boolean;
};

export default function Intelligence() {
  const [items, setItems] = useState<Report[]>([]);
  const [term, setTerm] = useState("");
  const [msg, setMsg] = useState("");

  async function load(query = "") {
    const r = await fetch(`/api/intelligence${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    const d = await r.json();
    if (r.ok) setItems(d.reports);
    else setMsg(d.error);
  }

  useEffect(() => { void load(); }, []);

  return (
    <main className="simple-page">
      <a href="/" className="back">← Dashboard</a>
      <p className="eyebrow">SAMPLE THREAT INFORMATION</p>
      <h1>Threat reports</h1>
      <p className="subheading">Reference intelligence for matching scan findings. These sample reports are not scan results or live threat feeds.</p>

      <section className="report-explainer">
        <div>
          <b>Looking for your scan result?</b>
          <p>Open Scan History to see completed scans, then use Threat Matches to compare their CVEs with these reports.</p>
        </div>
        <div className="report-next-actions">
          <a className="button report-secondary" href="/scans">View scan history</a>
          <a className="button primary" href="/correlation">Check for threat matches</a>
        </div>
      </section>

      <form className="search-row" onSubmit={(e) => { e.preventDefault(); void load(term); }}>
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search sample reports" />
        <button className="button primary">Search</button>
      </form>
      {msg && <p className="form-message error">{msg}</p>}
      {items.map((item) => (
        <article className="form-card" key={item.report_id}>
          <div className="report-head"><h2>{item.title}</h2><span className="demo-badge">SAMPLE DATA</span></div>
          <p className="subheading">{item.summary}</p>
          <p className="report-description">{item.description}</p>
          <div className="report-meta"><span>{item.category}</span><span>{item.cve_ids?.join(", ")}</span><span>Source: {item.source}</span></div>
        </article>
      ))}
      {!items.length && !msg && <div className="table-card">No threat reports found. Run the seed command to add the demo report.</div>}
    </main>
  );
}
