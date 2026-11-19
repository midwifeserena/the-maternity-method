import type {Metadata} from 'next';
import {SiteBrand} from '@/components/site-brand';
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

const maternityDifferences = [
  ['You have two patients at once.', 'You’re thinking about what each decision means for mom and baby.'],
  ['Normal looks different.', 'Pregnancy changes what you expect to see in vital signs, lab results, and fluid balance.'],
  ['It has its own language.', 'Decels, Leopold’s maneuvers, GTPAL, lochia, fundal height. It can feel like learning a new language in six weeks.'],
  ['Things change fast.', 'A calm labor can become an emergency in minutes. You have to recognize the change and know what to do next.'],
  ['There’s a lot to learn in a short time.', 'Some programs fit the whole specialty into a few weeks.'],
];

const features = [
  ['Maternity practice questions', 'Practice for the NCLEX with clear rationales that explain why each answer makes sense. Try case studies, study sessions, and timed exams.'],
  ['Short video lessons', 'See the concepts explained clearly and visually, one topic at a time.'],
  ['Color study guides', 'Follow along with a guide for each video and pull it up when you need a quick review.'],
  ['Mnemonics and memory tricks', 'Use flashcards and memory cues to make the details stick.'],
];

const plans = [
  ['30 days', '$28'],
  ['90 days', '$59'],
  ['1 year', '$180'],
];

const faqs = [
  [
    'Who is The Maternity Method for?',
    'Nursing students studying maternity and newborn nursing and preparing for the NCLEX.',
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
    'The launch promo code will be valid for 7 days. Redeem it during that window to receive 90 days of access for $30. Once you redeem it, you’ll have 90 days of access.',
  ],
  [
    'Can I study on my phone?',
    'Yes. The platform is designed to work across mobile, tablet, and desktop screens.',
  ],
  [
    'Do I need a student account to join the launch list?',
    'No. You can join the launch list here without signing in to the student platform.',
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
        <SiteBrand href="#top" label="The Maternity Method launch page top" />

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
          Maternity isn’t just another class. <em>Stop studying it like one.</em>
        </h1>

        <p className={styles.lead}>
          The study platform made just for maternity and newborn nursing.
          Built by Serena, a licensed midwife with over 10 years of experience
          who went back to school for her RN.
        </p>

        <div className={styles.video}>
          <HeroVideo url={content.heroVideoUrl} title={content.heroVideoTitle} />
        </div>

        <div className={styles.actions}>
          <a className={styles.button} href="#launch">
            Join the launch list
          </a>
          <a className={styles.outline} href="#inside">
            See what’s inside ↓
          </a>
        </div>

        <p className={styles.small}>
          Join the launch list for $30 for 90 days. Your promo code arrives{' '}
          {launchDate} and is valid for 7 days.
        </p>
      </section>

      <section className={styles.section}>
        <h2>If maternity is kicking your behind, you’re in good company.</h2>
        <p className={styles.intro}>
          Ask nursing students which class made them cry and maternity is bound to come up.
          Here’s what students say when they talk about OB online.
        </p>

        <div className={styles.quoteWall}>
          {content.forumQuotes.map(({quote, source, url, context}) => (
            <figure className={styles.card} key={quote}>
              <blockquote>“{quote}”</blockquote>
              <figcaption>
                {context && <div>{context}</div>}
                <a className={styles.textLink} href={url}>{source}</a>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className={styles.quoteCaption}>Real posts from nursing students on online forums.</p>

        <p className={styles.centerNote}>
          Students who get A’s in other classes can still struggle on an OB exam.
          Maternity asks you to think differently, and that takes practice.
        </p>
      </section>

      <section className={`${styles.section} ${styles.champagne}`}>
        <h2>Everything you learned in med surg? Maternity flips it.</h2>
        <p className={styles.intro}>Maternity is its own specialty. Here’s why it feels that way in class.</p>
        <div className={styles.three}>
          {maternityDifferences.map(([name, text]) => (
            <article className={styles.card} key={name}>
              <h3>{name}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <p className={styles.centerNote}>
          Your big NCLEX book gives maternity a few chapters. It deserves a whole platform.
        </p>
      </section>

      <section
        id="about"
        className={styles.section}
      >
        <div className={styles.founder}>
          {content.founderPhotoPath ? (
            <img
              className={styles.photo}
              src={content.founderPhotoPath}
              width={1087}
              height={1447}
              loading="lazy"
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
            <p className={styles.eyebrow}>Meet The Maternity Method</p>
            <h2>Built by a midwife. Made for how you actually learn.</h2>
            <p>
              I’m Serena. I’ve been a licensed midwife for over 10 years delivering
              babies in an out of hospital setting. I recently went back to school and
              earned my RN. Along the way, I watched so many smart, hardworking students
              struggle with OB. That’s why I built The Maternity Method. OB doesn’t have
              to feel this hard and you don’t have to figure it out alone.
            </p>
            <a className={styles.textLink} href="#launch">
              Join the launch list
            </a>
          </div>
        </div>
      </section>

      <section id="inside" className={styles.section}>
        <h2>Inside the Study Suite</h2>
        <p className={styles.intro}>
          Made for busy brains, including students with ADHD and anyone who studies best in short bursts.
        </p>

        {content.questionBankCount !== null && (
          <p className={styles.intro}>
            {content.questionBankCount.toLocaleString()} practice
            questions to build your understanding.
          </p>
        )}

        <div className={styles.four}>
          {features.map(([name, text]) => (
            <article className={styles.card} key={name}>
              <h3>{name}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <p className={styles.centerNote}>Maternity and newborn nursing is all we do.</p>
      </section>

      <section id="pricing" className={`${styles.section} ${styles.champagne}`}>
        <h2>Pick your plan</h2>
        <div className={styles.three}>
          {plans.map(([duration, price]) => (
            <article className={`${styles.card} ${styles.plan}`} key={duration}>
              <h3>{duration}</h3>
              <p><strong>{price}</strong></p>
            </article>
          ))}
        </div>
        <p className={styles.centerNote}>
          <strong>Launch special. Get 90 days for $30.</strong>{' '}
          The launch list gets first access. The offer is available for 7 days after launch.
        </p>
      </section>

      <section id="mentorship" className={styles.section} aria-labelledby="mentorship-title">
        <div className={`${styles.card} ${styles.mentorship}`}>
          <p className={styles.badge}>Launch week exclusive</p>
          <h2 id="mentorship-title">The Maternity Method Mentorship</h2>
          <img className={styles.skoolLogo} src="/images/skool-wordmark.png" width={384} height={125} alt="Skool" loading="lazy" />
          <p>
            Sign up for The Maternity Method within the first 7 days of launch
            and you’ll get free access to our private Skool community.
            Get real mentorship, ask questions, and connect with other nursing
            students and NCLEX takers.
          </p>
          <p><strong>Once launch week ends, this free bonus is gone.</strong></p>
        </div>
      </section>

      <section
        id="launch"
        className={`${styles.section} ${styles.champagne}`}
      >
        <div className={styles.signup}>
          <p className={styles.badge}>Launch list offer</p>
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
            Get launch news and study tips. Unsubscribe anytime.
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
        <h2>You don’t have to fail maternity to learn it.</h2>
        <p>Join the launch list and get first access on {content.launchDate}.</p>

        <a className={styles.lightButton} href="#launch">
          Join the launch list
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

      </footer>
    </main>
  );
}
