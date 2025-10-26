export default function Footer() {
  return (
    <footer className="quiz-footer">
      <div className="social-media" aria-label="Social links">
        <a
          href="https://www.facebook.com/MECA.CLUB.USTHB"
          aria-label="Facebook"
          className="icon-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="fa-brands fa-facebook" />
        </a>
        <a
          href="https://www.instagram.com/meca.club.usthb/"
          aria-label="Instagram"
          className="icon-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="fa-brands fa-instagram" />
        </a>
        <a
          href="mailto:meca.club.usthb@gmail.com"
          aria-label="Email"
          className="icon-link"
        >
          <i className="fa-solid fa-envelope" />
        </a>
        <a
          href="https://www.linkedin.com/company/mecaclubusthb/posts/?feedView=all"
          aria-label="LinkedIn"
          className="icon-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="fa-brands fa-linkedin" />
        </a>
      </div>
      <p>By MecaClub USTHB © {new Date().getFullYear()}</p>
    </footer>
  );
}
