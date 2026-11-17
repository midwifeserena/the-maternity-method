import type {Metadata} from 'next';
import Image from 'next/image';
import {Fraunces, Nunito_Sans} from 'next/font/google';
import {launchConfig as content} from './launch-config';
import {HeroVideo} from './components/hero-video';
import {KitForm} from './components/kit-form';
import styles from './page.module.css';

const heading = Fraunces({
  subsets: ['latin'],
  variable: '--launch-heading',
  display: 'swap',
});

const body = Nunito_Sans({
  subsets: ['latin'],
  variable: '--launch-body',
  display: 'swap',
});

const launchDate = 'January 11, 2027';
const title = 'The Maternity Method | $30 for 90 Days at Launch';
const description =
  `The maternity and newborn study system built by a licensed midwife. ` +
  `Join the launch list for $30 for 90 days. Your promo code arrives ` +
  `${launchDate} and is valid for 7 days.`;

export const metadata: Metadata = {
  title,
  description,
  ...(content.siteUrl
    ? {metadataBase: new URL(content.siteUrl)}
    : {}),
  openGraph: {
    title,
    description,
    images: [
      {
        url: content.logoPath,
        alt: 'The Maternity Method logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [content.logoPath],
  },
};

const features = [
  [
    'Practice with purpose',
    'Work through maternity and newborn questions, with rationales that help you understand the why.',
  ],
  [
    'Build clinical judgment',
    'Connect the patient story to your next nursing action with NGN questions and case studies.',
  ],
  [
    'Study your way',
    'Choose study sessions or timed exams, then revisit your answers and explanations.',
  ],
  [
    'Make it stick',
    'Bring concepts together with video lessons, study guides, and flashcards.',
  ],
];

const faqs = [
  [
    'Who is The Maternity Method for?',
    'Nursing students studying maternity and newborn nursing and preparing for NCLEX-style questions.',
  ],
  [
    'What is included?',
    'The study platform brings together practice questions, study and timed exams, NGN content, video lessons, study guides, and flashcards.',
  ],
  [
    'When does it launch?',
    `The Maternity Method launches ${launchDate}. Join the launch list to receive your promo code by email on launch day.`,
  ],
  [
    'How does the $30 offer work?',
    `Join the launch list and we’ll email your promo code on ${launchDate}. Use it to purchase 90 days of access to The Maternity Method for $30.`,
  ],
  [
    'How long is the promo code valid?',
    'The launch promo code will be valid for 7 days. Redeem it during that window to receive 90 days of access for $30. The 7-day window applies to redeeming the code, not to the length of your access.',
  ],
  [
    'Can I study on my phone?',
    'Yes. The platform is designed to work across mobile, tablet, and desktop screens.',
  ],
  [
    'Do I need a student account to join the list?',
    'No. You can join the launch email list here without signing in to the student platform.',
  ],
];

export default function LaunchPage() {
  return (
    <main
      id="top"
      className={`${styles.page} ${heading.variable} ${body.variable}`}
    >
      <a className={styles.skip} href="#main-content">
        Skip to content
      </a>

      <header className={styles.header}>
        <a className={styles.brand} href="#top">
          <Image
            src={content.headerLogoPath}
            width={72}
            height={48}
            alt="The Maternity Method logo"
            priority
          />
          <span>
            The Maternity
            <br />
            Method
          </span>
        </a>

        <nav aria-label="Launch page">
          <a href="#inside">What’s inside</a>
          <a href="#about">Meet Serena</a>
          <a href="#faq">FAQ</a>
          <a className={styles.button} href="#launch">
            Join the launch list
          </a>
        </nav>
      </header>

      <section id="main-content" className={styles.hero}>
        <p className={styles.badge}>
          Launching {launchDate} · $30 for 90 days
        </p>

        <h1>
          Maternity shouldn’t be the class
          <br className={styles.desktopBreak} /> that <em>sinks you.</em>
        </h1>

        <p className={styles.lead}>
          Make maternity and newborn nursing make sense—with clear
          explanations, meaningful practice, and a method you can come
          back to.
        </p>

        <div className={styles.video}>
          <HeroVideo url={content.heroVideoUrl} />
        </div>

        <div className={styles.actions}>
          <a className={styles.button} href="#launch">
            Get my $30 launch code
          </a>
          <a className={styles.outline} href="#inside">
            See what’s inside ↓
          </a>
        </div>

        <p className={styles.small}>
          Join the list for $30 for 90 days. Your promo code arrives{' '}
          {launchDate} and is valid for 7 days.
        </p>

        <p className={styles.small}>
          Built by Serena, a licensed midwife. Made for the way you learn.
        </p>
      </section>

      <section className={styles.section}>
        <h2>Does this sound familiar?</h2>

        <div className={styles.three}>
          {[
            [
              'You know the facts. The question still trips you up.',
              'You want to understand what the nurse should do—and why.',
            ],
            [
              'Everything feels like a priority.',
              'You need help connecting clinical findings to safe nursing decisions.',
            ],
            [
              'You’re studying more, but it isn’t sticking.',
              'You want focused practice and explanations you can actually use.',
            ],
          ].map(([name, text]) => (
            <article className={styles.card} key={name}>
              <h3>{name}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>

        <p className={styles.centerNote}>
          Let’s turn “I hope I remember this” into “I understand what
          comes next.”
        </p>
      </section>

      <section
        id="about"
        className={`${styles.section} ${styles.champagne}`}
      >
        <div className={styles.founder}>
          {content.founderPhotoPath ? (
            <img
              className={styles.photo}
              src={content.founderPhotoPath}
              alt="Serena, founder of The Maternity Method"
            />
          ) : (
            <div className={styles.photoPlaceholder}>
              Meet Serena
              <br />
              <span>Licensed midwife · Founder</span>
            </div>
          )}

          <div>
            <p className={styles.eyebrow}>Why I built this</p>
            <h2>
              Maternity makes more sense when you can see the whole
              picture.
            </h2>
            <p>
              I’m Serena, a licensed midwife and the founder of The
              Maternity Method. This platform brings maternity and
              newborn concepts together with focused practice and clear
              explanations.
            </p>
            <p>
              The goal is simple: help you connect what you’re learning
              to the clinical decisions a nurse needs to make, one
              concept at a time.
            </p>
            <a className={styles.textLink} href="#launch">
              Come learn with us →
            </a>
          </div>
        </div>
      </section>

      <section id="inside" className={styles.section}>
        <h2>Everything maternity. Nothing extra.</h2>
        <p className={styles.intro}>
          A focused place to practice, review, and connect the dots.
        </p>

        {content.questionBankCount !== null && (
          <p className={styles.intro}>
            {content.questionBankCount.toLocaleString()} practice
            questions to build your understanding.
          </p>
        )}

        <div className={styles.four}>
          {features.map(([name, text], i) => (
            <article className={styles.card} key={name}>
              <span className={styles.number}>0{i + 1}</span>
              <h3>{name}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.dark}`}>
        <h2>Made for you if…</h2>
        <div className={styles.three}>
          {[
            'You want maternity to feel understandable, not overwhelming.',
            'You’re ready to move beyond memorizing and build clinical judgment.',
            'You want a focused study companion for your nursing school journey.',
          ].map(text => (
            <p key={text}>{text}</p>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2>What students are saying</h2>
        <p className={styles.intro}>
          A space for feedback from our student community.
        </p>

        <div className={styles.three}>
          {content.testimonials.map((item, i) => (
            <article key={i} className={styles.card}>
              <p className={styles.placeholderLabel}>{item.detail}</p>
              <p>{item.quote}</p>
              <p className={styles.small}>{item.name}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="launch"
        className={`${styles.section} ${styles.champagne}`}
      >
        <div className={styles.signup}>
          <p className={styles.badge}>Exclusive launch-list offer</p>
          <h2>$30 for 90 days.</h2>

          <p>
            Join the launch list for The Maternity Method. We’ll email
            your promo code on <strong>{launchDate}</strong> so you can
            get <strong>90 days of access for $30</strong>.
          </p>

          <p>
            Your promo code will be valid for <strong>7 days</strong>.
            Watch your inbox on launch day!
          </p>

          <KitForm uid={content.kitFormUid} />

          <p className={styles.small}>
            No spam. Just launch news and thoughtful study support.
            Unsubscribe anytime.
          </p>
        </div>
      </section>

      <section id="faq" className={styles.section}>
        <h2>Questions?</h2>

        <div className={styles.faq}>
          {faqs.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}

          {content.contactEmail && (
            <p>
              Still have a question?{' '}
              <a
                className={styles.textLink}
                href={`mailto:${content.contactEmail}`}
              >
                Email us
              </a>
              .
            </p>
          )}
        </div>
      </section>

      <section className={`${styles.section} ${styles.final}`}>
        <h2>Walk into your next OB exam confident.</h2>
        <p>Join the launch list for $30 for 90 days.</p>

        <a className={styles.lightButton} href="#launch">
          Get my $30 launch code
        </a>

        <p className={styles.small}>
          Promo code emailed {launchDate} · Valid for 7 days
        </p>
      </section>

      <footer className={styles.footer}>
        <span>
          © {new Date().getFullYear()} The Maternity Method
        </span>

        {content.contactEmail ? (
          <a href={`mailto:${content.contactEmail}`}>Contact us</a>
        ) : (
          <a href="#faq">Questions? Start here</a>
        )}

        <span>Maternity made to make sense.</span>
      </footer>
    </main>
  );
}
