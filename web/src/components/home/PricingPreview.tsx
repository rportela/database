import { useId } from "react";

import styles from "./PricingPreview.module.css";

type Plan = {
  name: string;
  summary: string;
  startingAt: string;
  href: string;
};

type PricingPreviewProps = {
  headline: string;
  plans: Plan[];
  note: string;
};

export function PricingPreview({ headline, plans, note }: PricingPreviewProps): JSX.Element {
  const headingId = useId();

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.headline}>
        {headline}
      </h2>
      <div className={styles.plans}>
        {plans.map((plan) => (
          <article className={styles.planCard} key={plan.name}>
            <h3 className={styles.planName}>{plan.name}</h3>
            <p className={styles.planSummary}>{plan.summary}</p>
            <span className={styles.startingAt}>Starting at {plan.startingAt}</span>
            <a className={styles.planLink} href={plan.href}>
              See plan details
            </a>
          </article>
        ))}
      </div>
      <p className={styles.note}>{note}</p>
    </section>
  );
}
