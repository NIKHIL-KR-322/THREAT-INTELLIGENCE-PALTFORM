"use client";

import { Fragment, useEffect, useState } from "react";

type Ticket = {
  ticket_id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  asset_name: string;
  alert_id: number;
  assigned_to: number | null;
  assigned_analyst: string | null;
  notes?: { note: string; created_at: string }[];
};
type Assignee = { id: number; name: string; email: string; role: "ADMIN" | "ANALYST" };

export default function Tickets() {
  const [rows, setRows] = useState<Ticket[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [view, setView] = useState<"all" | "mine">("all");

  async function load() {
    const [r, meResponse] = await Promise.all([fetch("/api/tickets"), fetch("/api/auth/me")]);
    const [d, me] = await Promise.all([r.json(), meResponse.json()]);
    if (typeof me.id === "number") setCurrentUserId(me.id);
    if (Array.isArray(d.tickets)) {
      setRows(d.tickets);
      setAssignees(Array.isArray(d.assignees) ? d.assignees : []);
    } else setNotice(d.error || "Could not load tickets.");
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const ticketId = Number(new URLSearchParams(window.location.search).get("ticket"));
    if (Number.isInteger(ticketId) && ticketId > 0) setSelectedId(ticketId);
  }, []);

  async function update(id: number, data: object) {
    const r = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket_id: id, ...data }),
    });
    const d = await r.json();
    setNotice(r.ok ? "Ticket saved." : d.error);
    if (r.ok) await load();
  }

  const visibleRows = view === "mine" ? rows.filter((ticket) => ticket.assigned_to === currentUserId) : rows;
  const myTicketCount = rows.filter((ticket) => ticket.assigned_to === currentUserId).length;

  return (
    <main className="simple-page">
      <a href="/" className="back">← Dashboard</a>
      <p className="eyebrow">FOLLOW-UP WORK</p>
      <h1>Investigation tickets</h1>
      <p className="subheading">Open a ticket to review the related alert and follow-up notes.</p>
      {notice && <p className="form-message">{notice}</p>}
      <div className="table-card">
        <div className="ticket-list-heading"><h2>Tickets</h2><span>{visibleRows.length} shown</span></div>
        <div className="ticket-filters" aria-label="Filter tickets">
          <button type="button" className={view === "all" ? "active" : ""} onClick={() => setView("all")}>All tickets <span>{rows.length}</span></button>
          <button type="button" className={view === "mine" ? "active" : ""} onClick={() => setView("mine")} disabled={currentUserId === null}>Assigned to me <span>{myTicketCount}</span></button>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>TICKET</th><th>ASSET</th><th>PRIORITY</th><th>STATUS</th><th>NOTES</th></tr></thead>
            <tbody>
              {visibleRows.map((ticket) => (
                <Fragment key={ticket.ticket_id}>
                  <tr key={ticket.ticket_id} id={`ticket-${ticket.ticket_id}`}>
                    <td>
                      <button
                        className="ticket-title"
                        type="button"
                        aria-expanded={selectedId === ticket.ticket_id}
                        onClick={() => setSelectedId(selectedId === ticket.ticket_id ? null : ticket.ticket_id)}
                      >
                        <span>#{ticket.ticket_id} {ticket.title}</span>
                        <small>{selectedId === ticket.ticket_id ? "Hide details ↑" : "Open details ↓"}</small>
                      </button>
                    </td>
                    <td>{ticket.asset_name}</td>
                    <td>{ticket.priority}</td>
                    <td>
                      <select aria-label={`Status for ticket ${ticket.ticket_id}`} value={ticket.status} onChange={(e) => void update(ticket.ticket_id, { status: e.target.value })}>
                        <option>Open</option><option>In Progress</option><option>Resolved</option><option>Closed</option>
                      </select>
                    </td>
                    <td><button className="small-button" onClick={() => { const note = prompt("Add a short investigation note:"); if (note) void update(ticket.ticket_id, { alert_id: ticket.alert_id, note }); }}>Add note</button></td>
                  </tr>
                  {selectedId === ticket.ticket_id && (
                    <tr key={`${ticket.ticket_id}-details`}>
                      <td colSpan={5}>
                        <section className="ticket-details" aria-label={`Details for ticket ${ticket.ticket_id}`}>
                          <div className="ticket-detail-grid">
                            <div><small>LINKED ALERT</small><b>Alert #{ticket.alert_id}</b></div>
                            <div className="ticket-assignee">
                              <label htmlFor={`assignee-${ticket.ticket_id}`}>Assign to</label>
                              <select
                                id={`assignee-${ticket.ticket_id}`}
                                value={ticket.assigned_to == null ? "" : String(ticket.assigned_to)}
                                onChange={(e) => void update(ticket.ticket_id, { assigned_to: e.target.value ? Number(e.target.value) : null })}
                              >
                                <option value="">Unassigned</option>
                                {assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name} ({assignee.role})</option>)}
                              </select>
                              <small>Current: {ticket.assigned_analyst || "Unassigned"}</small>
                            </div>
                            <div><small>CREATED</small><b>{new Date(ticket.created_at).toLocaleString()}</b></div>
                          </div>
                          <div className="ticket-description"><small>DESCRIPTION</small><p>{ticket.description || "No description was provided."}</p></div>
                          <div className="ticket-notes"><small>INVESTIGATION NOTES</small>
                            {ticket.notes?.length ? ticket.notes.map((note, index) => <p key={`${ticket.ticket_id}-note-${index}`}>{note.note}</p>) : <p>No notes yet. Use “Add note” to record the investigation.</p>}
                          </div>
                        </section>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {!visibleRows.length && <p className="empty-table">{view === "mine" ? "No tickets are assigned to your account yet." : "No tickets yet. Create one from an alert."}</p>}
      </div>
    </main>
  );
}
