import { useId } from "react";

import styles from "./ServerlessIcebergExplainer.module.css";

type ServerlessIcebergExplainerProps = {
  headline: string;
  paragraphs: string[];
  bullets: string[];
  learnMoreHref: string;
};

export function ServerlessIcebergExplainer({
  headline,
  paragraphs,
  bullets,
  learnMoreHref,
}: ServerlessIcebergExplainerProps): JSX.Element {
  const headingId = useId();

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.headline}>
        {headline}
      </h2>
      <div className={styles.content}>
        <div className={styles.paragraphs}>
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <a className={styles.learnMore} href={learnMoreHref}>
            Learn more in the docs
          </a>
        </div>
        <ul className={styles.bullets}>
          {bullets.map((bullet) => (
            <li key={bullet} className={styles.bulletItem}>
              {bullet}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
