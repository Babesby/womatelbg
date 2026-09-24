import React from "react";
import "./she-leads-interest.css";

const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSf1_Q93ikq52r7bsFDxFjSYu38cvRiD7gAa8ARrOF5y13A08A/viewform?embedded=true";

export default function SheLeads2027Interest() {
  return (
    <section id="she-leads-2027-interest" className="she2027Interest" aria-labelledby="she2027InterestTitle">
      <div className="she2027Interest__intro">
        <span className="she2027Interest__eyebrow">COHORT 2 · 2026</span>
        <h2 id="she2027InterestTitle">Applications for 2026 Cohort 2 are now closed.</h2>
        <p>
          Thank you for the incredible interest in She Leads. Interested in the next cohort?
          Complete the 2027 expression of interest below.
        </p>
      </div>

      <div className="she2027Interest__formShell">
        <div className="she2027Interest__formTop">
          <span>She Leads 2027</span>
          <strong>Expression of Interest</strong>
        </div>
        <iframe
          className="she2027Interest__iframe"
          src={FORM_URL}
          title="She Leads 2027 Expression of Interest"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        >
          Your browser does not support embedded forms.
        </iframe>
      </div>
    </section>
  );
}
