"use client";
import { useEffect } from "react";
import styles from "./ScheduleModal.module.css";

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ScheduleModal({ isOpen, onClose }: ScheduleModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`${styles.scheduleModal} ${isOpen ? styles.active : ""}`}
      onClick={onClose}
    >
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close schedule"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <h1>Event Schedule</h1>

        {/* Event Info */}
        <div className={styles.eventInfo}>
          <div className={styles.infoItem}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>October 30, 2025</span>
          </div>
          <div className={styles.infoItem}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>Auditorium, USTHB</span>
          </div>
        </div>

        {/* Timeline Container */}
        <div className={styles.timelineWrapper}>
          {/* Central Vertical Bar */}
          <div className={styles.bar}></div>

          {/* Schedule Container with all events */}
          <div className={styles.scheduleContainer}>
            {/* Full Width Event - Exhibition (Top) */}
            <div className={`${styles.timelineItem} ${styles.fullWidth}`}>
              <div className={`${styles.elmntCard} ${styles.center}`}>
                <div className={styles.timeSlot}>
                  <p>09:00 - 17:00</p>
                </div>
                <div className={styles.eventDetails}>
                  <h3 className={styles.eventTitle}>Exhibition Open All Day</h3>
                  <p>
                    Stands for Startups, Associations, University Clubs, Medical
                    & Technological Innovation
                  </p>
                </div>
              </div>
            </div>

            {/* Event 1 - Right */}
            <div className={styles.timelineItem}>
              <div className={`${styles.elmntCard} ${styles.right}`}>
                <div className={styles.timeSlot}>
                  <p>09:00 - 09:30</p>
                </div>
                <div className={styles.eventDetails}>
                  <h3 className={styles.eventTitle}>Opening Ceremony</h3>
                  <p>Welcome speech and introduction to the event.</p>
                </div>
              </div>
              <div className={styles.timelineNode}></div>
            </div>

            {/* Event 2 - Left */}
            <div className={styles.timelineItem}>
              <div className={`${styles.elmntCard} ${styles.left}`}>
                <div className={styles.timeSlot}>
                  <p>09:30 - 10:30</p>
                </div>
                <div className={styles.eventDetails}>
                  <h3 className={styles.eventTitle}>Conference</h3>
                  <p>Breast Cancer Awareness</p>
                </div>
              </div>
              <div className={styles.timelineNode}></div>
            </div>

            {/* Event 3 - Right */}
            <div className={styles.timelineItem}>
              <div className={`${styles.elmntCard} ${styles.right}`}>
                <div className={styles.timeSlot}>
                  <p>10:30 - 12:00</p>
                </div>
                <div className={styles.eventDetails}>
                  <h3 className={styles.eventTitle}>Conference</h3>
                  <p>How to Create Your Tech Startup</p>
                </div>
              </div>
              <div className={styles.timelineNode}></div>
            </div>

            {/* Event 4 - Left */}
            <div className={styles.timelineItem}>
              <div className={`${styles.elmntCard} ${styles.left}`}>
                <div className={styles.timeSlot}>
                  <p>12:00 - 13:00</p>
                </div>
                <div className={styles.eventDetails}>
                  <h3 className={styles.eventTitle}>
                    Lunch Break & Networking
                  </h3>
                  <p>Time to connect and discuss.</p>
                </div>
              </div>
              <div className={styles.timelineNode}></div>
            </div>

            {/* Event 5 - Right */}
            <div className={styles.timelineItem}>
              <div className={`${styles.elmntCard} ${styles.right}`}>
                <div className={styles.timeSlot}>
                  <p>13:30 - 15:30</p>
                </div>
                <div className={styles.eventDetails}>
                  <h3 className={styles.eventTitle}>Talk Show</h3>
                  <p>Engineers & Entrepreneurs</p>
                </div>
              </div>
              <div className={styles.timelineNode}></div>
            </div>

            {/* Event 6 - Left */}
            <div className={styles.timelineItem}>
              <div className={`${styles.elmntCard} ${styles.left}`}>
                <div className={styles.timeSlot}>
                  <p>15:30 - 16:00</p>
                </div>
                <div className={styles.eventDetails}>
                  <h3 className={styles.eventTitle}>Interactive Quiz</h3>
                  <p>Via the TechWomen Website</p>
                </div>
              </div>
              <div className={styles.timelineNode}></div>
            </div>

            {/* Full Width Event - Closing Ceremony (Bottom) */}
            <div className={`${styles.timelineItem} ${styles.fullWidth}`}>
              <div className={`${styles.elmntCard} ${styles.center}`}>
                <div className={styles.timeSlot}>
                  <p>16:00 - 17:00</p>
                </div>
                <div className={styles.eventDetails}>
                  <h3 className={styles.eventTitle}>Closing Ceremony</h3>
                  <p>Acknowledgements and closing remarks.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
