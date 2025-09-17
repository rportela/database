import styles from "./Footer.module.css";

type FooterLink = {
  label: string;
  href: string;
};

type FooterColumn = {
  title: string;
  links: FooterLink[];
};

type FooterProps = {
  company: string;
  columns: FooterColumn[];
  contact: FooterLink;
  legal: FooterLink[];
  copyright: string;
};

export function Footer({ company, columns, contact, legal, copyright }: FooterProps): JSX.Element {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.topRow}>
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className={styles.columnTitle}>{column.title}</h3>
              <ul className={styles.linkList}>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className={styles.contact}>
            <h3 className={styles.columnTitle}>Contact</h3>
            <span>Questions?</span>
            <a href={contact.href}>{contact.label}</a>
          </div>
        </div>
        <div className={styles.bottomRow}>
          <span className={styles.brand}>{company}</span>
          <div className={styles.legal}>
            {legal.map((item) => (
              <a key={item.label} href={item.href}>
                {item.label}
              </a>
            ))}
          </div>
          <span>{copyright}</span>
        </div>
      </div>
    </footer>
  );
}
