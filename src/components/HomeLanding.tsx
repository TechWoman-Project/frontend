"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import member1 from "@/../public/assets/members/member-1.png";
import member2 from "@/../public/assets/members/member-2.png";
import Footer from "./Footer";
import Header from "./Header";
import ScheduleModal from "./ScheduleModal";
import logoSponsor1 from "@/../public/assets/sponsorLogo1.png";
import logoSponsor2 from "@/../public/assets/sponsorLogo2.png";
import { supabase } from "@/lib/supabase";

export default function HomeLanding() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [hasActiveQuiz, setHasActiveQuiz] = useState(false);
  const slides = [member1, member2];

  const indexRef = useRef(index);
  indexRef.current = index;
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const interval = setInterval(() => {
      const nextIndex = (indexRef.current + 1) % slides.length;
      setIndex(nextIndex);
      if (track) {
        track.style.transform = `translateX(-${nextIndex * 100}%)`;
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [slides.length]);

  useEffect(() => {
    const checkQuizAvailability = async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("id")
        .eq("status", "active")
        .eq("kind", "quiz")
        .limit(1);

      if (error) {
        console.error("Unable to fetch active quizzes", error);
        setHasActiveQuiz(false);
        return;
      }

      setHasActiveQuiz((data?.length ?? 0) > 0);
    };

    checkQuizAvailability();
  }, []);

  return (
    <div className="tw-globalContainer">
      <Header />

      <section className="tw-slider-wrapper" aria-label="Team members slider">
        <div className="tw-slider-container" data-carousel>
          <div className="tw-slider-track" ref={trackRef}>
            {slides.map((img, i) => (
              <div className="tw-slide" key={i}>
                <Image
                  src={img}
                  alt={`Team member ${i + 1}`}
                  className="tw-slide-img"
                  priority={i === 0}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="tw-section" style={{}}>
        <h2
          style={{
            color: "#3D116A",
          }}
        >
          TechWomen 2025 – l&apos;innovation au féminin, l’avenir en marche{" "}
        </h2>
        <p id="presentation-container">
          <span>
            Ici naissent les idées qui changent le monde. <br />
          </span>
          <span>
            TechWomen 2025 célèbre la femme innovatrice, créatrice et
            visionnaire, celle qui fait de la science et de la technologie un
            moteur d’espoir et de progrès. <br />
          </span>
          <span>
            En ce mois d’Octobre Rose, nous unissons la puissance de la
            technologie et la valeur de la recherche médicale pour rappeler que
            l’innovation peut aussi sauver des vies. <br />
          </span>
          <span>
            Parce qu’innover, c’est croire en la vie.
            <br />
            Et qu’aucune révolution ne se fait sans elles.
          </span>
        </p>
      </section>

      <div className="tw-video-placeholder">
        <iframe
          width="100%"
          height="100%"
          src="https://www.youtube.com/embed/m-6DVTqP_dE"
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      <div className="tw-buttons-center">
        <button
          className="tw-btn-primary"
          onClick={() => setIsScheduleOpen(true)}
        >
          Programme
        </button>
      </div>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
      />

      <section className="tw-section">
        <h2
          style={{
            color: "#3D116A",
          }}
        >
          Présentation de MecaClub
        </h2>
        <p id="presentation-container">
          <span>
            Meca club a pour objectifs inclure la promotion de l&apos;engagement
            des étudiants dans le domaine de la mécanique en offrant des
            opportunités d&apos;apprentissage pratique, de développement de
            compétences techniques et de collaboration interdisciplinaire.
            <br />
          </span>
          <span>
            Notre club vise généralement à fournir un environnement où les
            étudiants peuvent explorer divers aspects de la mécanique, y compris
            la conception, la fabrication, l&apos;analyse et l&apos;optimisation
            de systèmes mécaniques, et cela à travers la participation à des
            compétitions, des projets de recherche appliquée et des initiatives
            de service communautaire.
          </span>
        </p>
      </section>

      <div className="tw-buttons-dual">
        {hasActiveQuiz && (
          <Link href="/start-quiz" className="tw-btn-primary" role="button">
            Participer au Quiz
          </Link>
        )}
        {/* <Link href="/vote" className="tw-btn-secondary" role="button">
          Voter
        </Link> */}
      </div>

      <section className="tw-section">
        <h2
          style={{
            color: "#3D116A",
          }}
        >
          Nos Sponsors
        </h2>
        <p id="presentation-container">
          <span>Merci à nos partenaires pour leur soutien !</span>
        </p>
      </section>

      <div className="tw-sponsors-grid-aa">
        <div
          className="tw-sponsor-container"
          style={{
            backgroundImage: `url(${logoSponsor1})`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            height: "100px",
            width: "100px",
          }}
        >
          <Image
            src={logoSponsor1}
            alt="Logo Sponsor 1"
            // className="tw-sponsor-logo"
          />
        </div>
        <div
          className="tw-sponsor-container"
          style={{
            backgroundImage: `url(${logoSponsor1})`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            height: "100px",
            width: "100px",
          }}
        >
          <Image src={logoSponsor2} alt="Logo Sponsor 2" />
        </div>
      </div>
      <Footer />
    </div>
  );
}
