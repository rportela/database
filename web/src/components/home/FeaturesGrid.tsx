import { useId } from "react";

import styles from "./FeaturesGrid.module.css";

type Feature = {
  icon: string;
  title: string;
  body: string;
  href: string;
};

export type FeaturesGridProps = {
  headline: string;
  features: Feature[];
};

const icons: Record<string, JSX.Element> = {
  bolt: (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <path
        d="M13 2 3 14h7l-1 8 10-12h-7z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <path
        d="M12 3 5 6v6c0 4.418 2.686 8.167 7 9 4.314-.833 7-4.582 7-9V6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 12.5 11.25 15 15 9.75" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  scales: (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <path d="M12 3v18m5-14 4 7H13l4-7Zm-10 0 4 7H3l4-7Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  layers: (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <path
        d="M12 4 4 8l8 4 8-4-8-4Zm0 8L4 8m8 4 8-4m-8 4v8m8-4-8 4-8-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

function getIcon(name: string): JSX.Element {
  return icons[name] ?? icons.layers;
}

export function FeaturesGrid({ headline, features }: FeaturesGridProps): JSX.Element {
  const headingId = useId();

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.headline}>
        {headline}
      </h2>
      <div className={styles.grid}>
        {features.map((feature) => (
          <article className={styles.card} key={feature.title}>
            <span className={styles.iconWrapper}>{getIcon(feature.icon)}</span>
            <h3 className={styles.title}>{feature.title}</h3>
            <p className={styles.body}>{feature.body}</p>
            <a className={styles.link} href={feature.href}>
              Learn more
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 12 12 4m0 0H6m6 0v6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
