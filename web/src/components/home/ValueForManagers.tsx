import { useId } from "react";

import styles from "./ValueForManagers.module.css";

type Bullet = {
  title: string;
  body: string;
};

export type ValueForManagersProps = {
  headline: string;
  bullets: Bullet[];
  kicker: string;
};

export function ValueForManagers({ headline, bullets, kicker }: ValueForManagersProps): JSX.Element {
  const headingId = useId();

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <div>
        <h2 id={headingId} className={styles.headline}>
          {headline}
        </h2>
      </div>
      <div className={styles.bullets}>
        {bullets.map((bullet) => (
          <article className={styles.bulletCard} key={bullet.title}>
            <h3 className={styles.bulletTitle}>{bullet.title}</h3>
            <p className={styles.bulletBody}>{bullet.body}</p>
          </article>
        ))}
      </div>
      <p className={styles.kicker}>{kicker}</p>
    </section>
  );
}
