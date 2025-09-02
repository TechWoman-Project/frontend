export default function Footer() {
  return (
    <footer className="quiz-footer">
      <div className="social-media" aria-label="Social links">
        <a href="#" aria-label="Facebook" className="icon-link">
          <i className="fa-brands fa-facebook" />
        </a>
        <a href="#" aria-label="Instagram" className="icon-link">
          <i className="fa-brands fa-instagram" />
        </a>
        <a
          href="mailto:contact@example.com"
          aria-label="Email"
          className="icon-link"
        >
          <i className="fa-solid fa-envelope" />
        </a>
        <a href="#" aria-label="LinkedIn" className="icon-link">
          <i className="fa-brands fa-linkedin" />
        </a>
      </div>
      <p>By MecaClub USTHB © {new Date().getFullYear()}</p>
    </footer>
  );
}
