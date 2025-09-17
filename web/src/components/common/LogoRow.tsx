import styles from "./LogoRow.module.css";

type Logo = {
  alt: string;
  src: string;
};

export type LogoRowProps = {
  logos: Logo[];
};

export function LogoRow({ logos }: LogoRowProps): JSX.Element | null {
  if (!logos || logos.length === 0) {
    return null;
  }

  return (
    <div className={styles.row} aria-label="Trusted by">
      {logos.map((logo) => (
        <div className={styles.logoWrapper} key={`${logo.src}-${logo.alt}`}>
          <img src={logo.src} alt={logo.alt} loading="lazy" decoding="async" />
        </div>
      ))}
    </div>
  );
}
