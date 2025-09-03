"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import logo from "@/../public/assets/logo.png";
import member1 from "@/../public/assets/members/member-1.png";
import member2 from "@/../public/assets/members/member-2.png";
import Footer from "./Footer";

export default function HomeLanding() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
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

  return (
    <div className="tw-globalContainer">
      <header className="tw-header">
        <div className="tw-slogan">
          <h2>Bienvenu à</h2>
          <p>L&apos;innovation au féminin, vers un futur audacieux</p>
        </div>
        <Image src={logo} alt="Tech Woman Logo" className="tw-logo" />
      </header>

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

      <section className="tw-section">
        <h2>Présentation de l’évènement</h2>
        <p>
          Tech Women 2025 est une initiative phare portée par le Méca Club –
          USTHB, visant à mettre en lumière le rôle essentiel des femmes dans
          les domaines techniques, scientifiques et industriels. Conçu comme un
          événement à fort rayonnement intellectuel et sociétal, il ambitionne
          de valoriser les compétences féminines, encourager la diversité dans
          les filières d’avenir et renforcer les synergies entre le monde
          académique, entrepreneurial et institutionnel. Organisé sur une
          journée unique, Tech Women 2025 prendra la forme d’un salon
          multidimensionnel, alliant conférences d’expertise, expositions
          technologiques, présentations de projets innovants, ainsi que
          workshops interactifs.
        </p>
      </section>

      <div className="tw-video-placeholder" aria-hidden="true" />

      <div className="tw-buttons-center">
        <button className="tw-btn-primary">Programme</button>
      </div>

      <section className="tw-section">
        <h2>Présentation de MecaClub</h2>
        <p>
          Meca club a pour objectifs inclure la promotion de l&apos;engagement
          des étudiants dans le domaine de la mécanique en offrant des
          opportunités d&apos;apprentissage pratique, de développement de
          compétences techniques et de collaboration interdisciplinaire. Notre
          club vise généralement à fournir un environnement où les étudiants
          peuvent explorer divers aspects de la mécanique, y compris la
          conception, la fabrication, l&apos;analyse et l&apos;optimisation de
          systèmes mécaniques, et cela à travers la participation à des
          compétitions, des projets de recherche appliquée et des initiatives de
          service communautaire.
        </p>
      </section>

      <div className="tw-buttons-dual">
        <Link href="/start-quiz" className="tw-btn-primary" role="button">
          Participer au Quiz
        </Link>
        <Link href="/start-quiz" className="tw-btn-secondary" role="button">
          Voter
        </Link>
      </div>

      <section className="tw-section">
        <h2>Nos Sponsors</h2>
        <p>Merci à nos partenaires pour leur soutien !</p>
      </section>

      <div className="tw-sponsors-grid">
        <div className="tw-sponsor"></div>
        <div className="tw-sponsor"></div>
        <div className="tw-sponsor"></div>
        <div className="tw-sponsor"></div>
        <div className="tw-sponsor"></div>
        <div className="tw-sponsor"></div>
      </div>
      <Footer />
    </div>
  );
}
