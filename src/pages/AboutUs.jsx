import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, Shapes, Sparkles } from 'lucide-react';

const principles = [
  {
    Icon: Shapes,
    title: 'Thoughtful form',
    description:
      'Clean lines and considered proportions help each piece feel at home in the spaces around it.',
  },
  {
    Icon: Leaf,
    title: 'Honest materials',
    description:
      'We celebrate natural textures and the quiet character that materials bring to everyday living.',
  },
  {
    Icon: Sparkles,
    title: 'Everyday ease',
    description:
      'Useful, welcoming pieces make it a little easier to slow down and enjoy being at home.',
  },
];

export default function AboutUs() {
  return (
    <div className="bg-[#F9F6F0] text-[#2D3831]">
      <section className="relative flex min-h-[56vh] items-center overflow-hidden bg-[#2D3A31]">
        <img
          src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=1920"
          alt="A calm, light-filled living space"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[#2D3831]/55" />
        <div className="relative mx-auto w-full max-w-7xl px-6 py-24 md:py-32">
          <p className="mb-5 text-xs uppercase tracking-[0.3em] text-[#F9F6F0]/75">
            A little about us
          </p>
          <h1 className="max-w-3xl font-serif text-5xl leading-tight text-[#F9F6F0] md:text-7xl">
            Make room for a more intentional home.
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-relaxed tracking-wide text-[#F9F6F0]/85 md:text-base">
            ELLE brings together considered furniture and living objects for
            spaces that feel calm, personal, and easy to live in.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-2 md:gap-20 md:py-28">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#2D3831]/60">
            Our point of view
          </p>
          <h2 className="mt-4 font-serif text-3xl leading-snug md:text-4xl">
            A home should feel like a place to come back to yourself.
          </h2>
        </div>
        <div className="space-y-5 text-sm leading-relaxed tracking-wide text-[#2D3831]/75 md:text-base">
          <p>
            We believe the things we live with shape how a room feels. A
            thoughtful silhouette, a natural finish, or a familiar place to sit
            can bring a little more ease to an ordinary day.
          </p>
          <p>
            That belief guides the ELLE collection: a curated selection of
            furniture and home pieces with a warm, understated point of view.
            We focus on designs that feel considered without asking for
            attention, and that leave space for the people who make a house a
            home.
          </p>
        </div>
      </section>

      <section className="bg-[#EBE5DE] px-6 py-20 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-[#2D3831]/60">
              What matters to us
            </p>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl">
              Less noise. More meaning.
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {principles.map(({ Icon, title, description }, index) => (
              <article
                key={title}
                className="border-t border-[#2D3831]/20 pt-6"
              >
                <div className="mb-8 flex items-center justify-between">
                  <Icon className="h-6 w-6 stroke-[1.4]" aria-hidden="true" />
                  <span className="text-xs tracking-[0.2em] text-[#2D3831]/50">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="font-serif text-2xl">{title}</h3>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#2D3831]/70">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="relative overflow-hidden bg-[#2D3A31]">
          <img
            src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=1920"
            alt="A thoughtfully arranged living room"
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#2D3A31]/95 via-[#2D3A31]/75 to-[#2D3A31]/25" />
          <div className="relative max-w-2xl px-8 py-16 md:px-14 md:py-20">
            <p className="text-xs uppercase tracking-[0.3em] text-[#F9F6F0]/70">
              Find your piece
            </p>
            <h2 className="mt-4 font-serif text-3xl leading-tight text-[#F9F6F0] md:text-5xl">
              Start with what feels like home.
            </h2>
            <Link
              to="/catalog"
              className="mt-8 inline-flex items-center gap-3 border border-[#F9F6F0] bg-[#F9F6F0] px-7 py-4 text-xs uppercase tracking-[0.2em] text-[#2D3A31] transition-colors hover:bg-transparent hover:text-[#F9F6F0]"
            >
              Explore the collection
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
