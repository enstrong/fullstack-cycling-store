import { useState } from "react";
import "@/css/tabs/support.css";
const questions = [
  [
    "How do I track my order?",
    "Your order number is shown after checkout. Keep it handy when contacting us about delivery or an order update.",
  ],
  [
    "What is your return policy?",
    "Contact us with your order number before sending an item back. We can help you check eligibility and arrange the next steps.",
  ],
  [
    "Do you ship internationally?",
    "Please contact us to confirm delivery availability for your country before placing an order.",
  ],
  [
    "How do I find the right bike size?",
    "Start with your height and inseam, then compare them with the manufacturer’s size chart for the specific model. If you’re between sizes, a professional bike fitting can help you choose a comfortable reach and riding position.",
  ],
  [
    "Do I need an account to shop?",
    "You can browse and add items to your cart without an account. Sign in or create an account when you’re ready to order. Your guest items will move into your account cart.",
  ],
];
export default function Support() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  return (
    <main className="support-page page-shell">
      <div className="container support-layout">
        <div className="support-intro">
          <span className="eyebrow">WE’RE ALONG FOR THE RIDE</span>
          <h1>
            A little help.
            <br />
            <em>A better ride.</em>
          </h1>
          <p>
            From finding your fit to getting your order on the road. Start here.
          </p>
          <a className="text-link" href="tel:87776664433">
            Talk to us ↗
          </a>
        </div>
        <section className="support-panel">
          <span className="eyebrow">THE ANSWERS YOU’RE LOOKING FOR</span>
          <button
            className="faq-master"
            aria-expanded={open}
            aria-controls="faq-list"
            onClick={() => setOpen(!open)}
          >
            <span>
              Frequently asked
              <br />
              questions.
            </span>
            <span
              className={`faq-cross ${open ? "rotated" : ""}`}
              aria-hidden="true"
            >
              +
            </span>
          </button>
          <p className="muted support-panel-note">
            The essentials, before you head out.
          </p>
          <div
            className={`faq-reveal ${open ? "expanded" : ""}`}
            id="faq-list"
            aria-hidden={!open}
            inert={!open}
          >
            <div className="faq-overflow">
              <div className="faq-list">
                {questions.map(([question, answer], i) => (
                  <div
                    className={`faq-item ${expanded === i ? "active" : ""}`}
                    key={question}
                  >
                    <button
                      className="faq-question"
                      aria-expanded={expanded === i}
                      aria-controls={`answer-${i}`}
                      onClick={() => setExpanded(expanded === i ? null : i)}
                    >
                      <span className="faq-number">0{i + 1}</span>
                      <span>{question}</span>
                      <span
                        className={`faq-cross ${expanded === i ? "rotated" : ""}`}
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </button>
                    <div
                      className={`faq-reveal ${expanded === i ? "expanded" : ""}`}
                      id={`answer-${i}`}
                      aria-hidden={expanded !== i}
                      inert={expanded !== i}
                    >
                      <div className="faq-overflow">
                        <p className="faq-answer">{answer}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
