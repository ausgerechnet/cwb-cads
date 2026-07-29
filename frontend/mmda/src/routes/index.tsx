import img1 from '../assets/mmda-v2-constellation.png'
import img2 from '../assets/mmda-v2-constellation-germaparl-cc.png'
import img3 from '../assets/mmda-v2-constellation-concordance.png'

import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const images = [img1, img2, img3]
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  return (
    <div className="mx-auto max-w-[1600px] p-8">
      <div className="grid gap-12 lg:grid-cols-2">
        {/* Main content */}
        <div className="space-y-12 lg:col-span-1">
          <section className="space-y-4">
            <h1 className="text-5xl font-bold">MMDA</h1>

            <h2 className="text-2xl">Mixed Methods Discourse Analysis</h2>

            <p className="max-w-3xl text-lg">
              Explore discourses through the combination of corpus-linguistic
              and computational-linguistic methods combined with qualitative
              interpretation.
            </p>

            <p>
              You can use the guest account to explore MMDA in read-only mode:
              <br />
              <span className="font-medium">
                Username: guest — Password: guest
              </span>
            </p>

            <p>
              Need an account with full access? Please contact{' '}
              <a
                href="mailto:philipp.heinrich@fau.de"
                className="font-medium underline"
              >
                philipp.heinrich@fau.de
              </a>{' '}
              to request access to MMDA.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <a
                href="/mmda-v2/login"
                className="inline-block rounded bg-black px-4 py-2 text-white"
              >
                Login
              </a>

              <a
                href="/mmda-v2/vignette"
                className="inline-block rounded bg-black px-4 py-2 text-white"
              >
                Vignette
              </a>
            </div>
          </section>

          <section className="max-w-4xl space-y-4">
            <h2 className="text-3xl font-semibold">What is MMDA?</h2>
            <p>
              MMDA is a platform for Corpus-Based Discourse Analysis that
              combines quantitative corpus methods with qualitative
              interpretation. It supports researchers in finding, exploring, and
              refining discourses in large collections of texts.
            </p>

            <p>
              At the heart of MMDA are <b>discoursemes</b>: a basic unit of
              discourse analysis that connects linguistic patterns and
              discursive patterns. Discoursemes represent meaningful groupings
              of words and other linguistic items that contribute to the
              construction of discourses.
            </p>

            <p>
              By combining corpus-based evidence with qualitative
              interpretation, discoursemes serve as building blocks for
              exploring how concepts, actors, and perspectives are
              linguistically constructed across texts, languages, and registers.
            </p>

            <p>
              The platform connects computational analysis with human
              interpretation: researchers define analytical concepts, explore
              corpus evidence, refine hypotheses, and return to the data with
              new questions.
            </p>
          </section>

          <section className="max-w-4xl space-y-6">
            <h2 className="text-3xl font-semibold">Core Publications</h2>

            <div className="space-y-8">
              <article>
                <h4 className="text-xl font-semibold">
                  From Linguistic to Discursive Patterns: Introducing
                  Discoursemes as a Basic Unit of Discourse Analysis
                </h4>

                <p>
                  Heinrich, Philipp; Blombach, Andreas; Dykes, Nathan; Evert,
                  Stephanie; Fuchs, Tamara; Havenstein, Linda; Schäfer, Fabian
                  (2024).
                </p>

                <p>
                  <em>CADAAD Journal 16(2), 87–111.</em>
                </p>

                <div className="space-x-4">
                  <a
                    className="underline"
                    href="https://doi.org/10.21827/cadaad.16.2.42457 "
                    target="_blank"
                    rel="noreferrer"
                  >
                    DOI
                  </a>
                </div>
              </article>

              <article>
                <h4 className="text-xl font-semibold">
                  Operationalising the Hermeneutic Grouping Process in
                  Corpus-assisted Discourse Studies
                </h4>

                <p>Heinrich, Philipp; Evert, Stephanie (2024).</p>

                <p>
                  <em>
                    Proceedings of the 4th Workshop on Computational Linguistics
                    for the Political and Social Sciences (CPSS 2024), 33–44.
                  </em>
                </p>

                <div className="space-x-4">
                  <a
                    className="underline"
                    href="https://aclanthology.org/2024.cpss-1.3/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    ACL Anthology
                  </a>
                </div>
              </article>
            </div>
          </section>
        </div>

        {/* Screenshots */}
        <aside className="space-y-8 lg:col-span-1 lg:pt-24">
          {images.map((image, index) => (
            <figure
              key={index}
              className="cursor-pointer"
              onClick={() => setSelectedImage(image)}
            >
              <img
                src={image}
                alt={`MMDA in action ${index + 1}`}
                className="w-full rounded-lg border object-contain shadow transition hover:opacity-90"
              />
            </figure>
          ))}
        </aside>

        {selectedImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8"
            onClick={() => setSelectedImage(null)}
          >
            <img
              src={selectedImage}
              alt="MMDA screenshot enlarged"
              className="max-h-full max-w-full rounded-lg shadow-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>
  )
}
