import { useId } from "react";

import styles from "./ArchDiagram.module.css";

type ImageConfig = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

type ArchDiagramProps = {
  headline: string;
  image: ImageConfig;
  legend: string[];
};

export function ArchDiagram({ headline, image, legend }: ArchDiagramProps): JSX.Element {
  const headingId = useId();

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.headline}>
        {headline}
      </h2>
      <div className={styles.diagram}>
        <img
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading="lazy"
          decoding="async"
        />
      </div>
      <ul className={styles.legend}>
        {legend.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
