import { ComponentProps } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Block } from './-block'
import { DiscoursemeCollocateTable } from '@/components/discourseme-collocate-table'

export const Route = createFileRoute(
  '/components_/discourseme-collocate-table',
)({
  component: () => (
    <Block componentTag="DiscoursemeCollocateTable">
      <DiscoursemeCollocateTable discoursemeScores={discoursemeScores} />
    </Block>
  ),
})

const discoursemeScores = [
  {
    discourseme_id: 13,
    global_scores: [
      {
        measure: 'discourseme_id',
        score: 13,
      },
      {
        measure: 'O11',
        score: 656,
      },
      {
        measure: 'O12',
        score: 8760,
      },
      {
        measure: 'O21',
        score: 0,
      },
      {
        measure: 'O22',
        score: 140384,
      },
      {
        measure: 'R1',
        score: 9416,
      },
      {
        measure: 'R2',
        score: 140384,
      },
      {
        measure: 'C1',
        score: 656,
      },
      {
        measure: 'C2',
        score: 149144,
      },
      {
        measure: 'N',
        score: 149800,
      },
      {
        measure: 'E11',
        score: 41.234286,
      },
      {
        measure: 'E12',
        score: 9374.765714,
      },
      {
        measure: 'E21',
        score: 614.765714,
      },
      {
        measure: 'E22',
        score: 139769.234286,
      },
      {
        measure: 'z_score',
        score: 95.737129,
      },
      {
        measure: 't_score',
        score: 24.002569,
      },
      {
        measure: 'log_likelihood',
        score: 3674.086233,
      },
      {
        measure: 'simple_ll',
        score: 2400.629171,
      },
      {
        measure: 'min_sensitivity',
        score: 0.069669,
      },
      {
        measure: 'liddell',
        score: 0.941265,
      },
      {
        measure: 'dice',
        score: 0.130262,
      },
      {
        measure: 'log_ratio',
        score: 23.221459,
      },
      {
        measure: 'conservative_log_ratio',
        score: 10.321136,
      },
      {
        measure: 'mutual_information',
        score: 1.201645,
      },
      {
        measure: 'local_mutual_information',
        score: 788.279358,
      },
      {
        measure: 'ipm',
        score: 69668.649108,
      },
      {
        measure: 'ipm_reference',
        score: 0,
      },
      {
        measure: 'ipm_expected',
        score: 4379.17223,
      },
    ],
    item_scores: [
      {
        item: 'CDU',
        raw_scores: [
          {
            measure: 'O11',
            score: 14,
          },
          {
            measure: 'O12',
            score: 9402,
          },
          {
            measure: 'O21',
            score: 0,
          },
          {
            measure: 'O22',
            score: 140384,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 14,
          },
          {
            measure: 'C2',
            score: 149786,
          },
          {
            measure: 'N',
            score: 149800,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 14,
          },
          {
            measure: 'O12',
            score: 9402,
          },
          {
            measure: 'O21',
            score: 0,
          },
          {
            measure: 'O22',
            score: 140384,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 14,
          },
          {
            measure: 'C2',
            score: 149786,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 0.88,
          },
          {
            measure: 'E12',
            score: 9415.12,
          },
          {
            measure: 'E21',
            score: 13.12,
          },
          {
            measure: 'E22',
            score: 140370.88,
          },
          {
            measure: 'z_score',
            score: 13.985967,
          },
          {
            measure: 't_score',
            score: 3.506467,
          },
          {
            measure: 'log_likelihood',
            score: 77.492457,
          },
          {
            measure: 'simple_ll',
            score: 51.23294,
          },
          {
            measure: 'min_sensitivity',
            score: 0.001487,
          },
          {
            measure: 'liddell',
            score: 0.93723,
          },
          {
            measure: 'dice',
            score: 0.002969,
          },
          {
            measure: 'log_ratio',
            score: 17.671362,
          },
          {
            measure: 'conservative_log_ratio',
            score: 3.963029,
          },
          {
            measure: 'mutual_information',
            score: 1.201645,
          },
          {
            measure: 'local_mutual_information',
            score: 16.823035,
          },
          {
            measure: 'ipm',
            score: 1486.830926,
          },
          {
            measure: 'ipm_reference',
            score: 0,
          },
          {
            measure: 'ipm_expected',
            score: 93.457944,
          },
        ],
      },
      {
        item: 'CDU / CSU',
        raw_scores: [
          {
            measure: 'O11',
            score: 440,
          },
          {
            measure: 'O12',
            score: 8976,
          },
          {
            measure: 'O21',
            score: 0,
          },
          {
            measure: 'O22',
            score: 140384,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 440,
          },
          {
            measure: 'C2',
            score: 149360,
          },
          {
            measure: 'N',
            score: 149800,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 440,
          },
          {
            measure: 'O12',
            score: 8976,
          },
          {
            measure: 'O21',
            score: 0,
          },
          {
            measure: 'O22',
            score: 140384,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 440,
          },
          {
            measure: 'C2',
            score: 149360,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 27.657143,
          },
          {
            measure: 'E12',
            score: 9388.342857,
          },
          {
            measure: 'E21',
            score: 412.342857,
          },
          {
            measure: 'E22',
            score: 139971.657143,
          },
          {
            measure: 'z_score',
            score: 78.406997,
          },
          {
            measure: 't_score',
            score: 19.657674,
          },
          {
            measure: 'log_likelihood',
            score: 2454.458868,
          },
          {
            measure: 'simple_ll',
            score: 1610.178103,
          },
          {
            measure: 'min_sensitivity',
            score: 0.046729,
          },
          {
            measure: 'liddell',
            score: 0.939904,
          },
          {
            measure: 'dice',
            score: 0.089286,
          },
          {
            measure: 'log_ratio',
            score: 22.645268,
          },
          {
            measure: 'conservative_log_ratio',
            score: 9.43252,
          },
          {
            measure: 'mutual_information',
            score: 1.201645,
          },
          {
            measure: 'local_mutual_information',
            score: 528.72396,
          },
          {
            measure: 'ipm',
            score: 46728.971963,
          },
          {
            measure: 'ipm_reference',
            score: 0,
          },
          {
            measure: 'ipm_expected',
            score: 2937.249666,
          },
        ],
      },
      {
        item: 'CDU / CSU-Fraktion',
        raw_scores: [
          {
            measure: 'O11',
            score: 7,
          },
          {
            measure: 'O12',
            score: 9409,
          },
          {
            measure: 'O21',
            score: 0,
          },
          {
            measure: 'O22',
            score: 140384,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 7,
          },
          {
            measure: 'C2',
            score: 149793,
          },
          {
            measure: 'N',
            score: 149800,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 7,
          },
          {
            measure: 'O12',
            score: 9409,
          },
          {
            measure: 'O21',
            score: 0,
          },
          {
            measure: 'O22',
            score: 140384,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 7,
          },
          {
            measure: 'C2',
            score: 149793,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 0.44,
          },
          {
            measure: 'E12',
            score: 9415.56,
          },
          {
            measure: 'E21',
            score: 6.56,
          },
          {
            measure: 'E22',
            score: 140377.44,
          },
          {
            measure: 'z_score',
            score: 9.889572,
          },
          {
            measure: 't_score',
            score: 2.479447,
          },
          {
            measure: 'log_likelihood',
            score: 38.741348,
          },
          {
            measure: 'simple_ll',
            score: 25.61647,
          },
          {
            measure: 'min_sensitivity',
            score: 0.000743,
          },
          {
            measure: 'liddell',
            score: 0.937187,
          },
          {
            measure: 'dice',
            score: 0.001486,
          },
          {
            measure: 'log_ratio',
            score: 16.671466,
          },
          {
            measure: 'conservative_log_ratio',
            score: 2.39938,
          },
          {
            measure: 'mutual_information',
            score: 1.201645,
          },
          {
            measure: 'local_mutual_information',
            score: 8.411518,
          },
          {
            measure: 'ipm',
            score: 743.415463,
          },
          {
            measure: 'ipm_reference',
            score: 0,
          },
          {
            measure: 'ipm_expected',
            score: 46.728972,
          },
        ],
      },
      {
        item: 'CSU',
        raw_scores: [
          {
            measure: 'O11',
            score: 6,
          },
          {
            measure: 'O12',
            score: 9410,
          },
          {
            measure: 'O21',
            score: 0,
          },
          {
            measure: 'O22',
            score: 140384,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 6,
          },
          {
            measure: 'C2',
            score: 149794,
          },
          {
            measure: 'N',
            score: 149800,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 6,
          },
          {
            measure: 'O12',
            score: 9410,
          },
          {
            measure: 'O21',
            score: 0,
          },
          {
            measure: 'O22',
            score: 140384,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 6,
          },
          {
            measure: 'C2',
            score: 149794,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 0.377143,
          },
          {
            measure: 'E12',
            score: 9415.622857,
          },
          {
            measure: 'E21',
            score: 5.622857,
          },
          {
            measure: 'E22',
            score: 140378.377143,
          },
          {
            measure: 'z_score',
            score: 9.155965,
          },
          {
            measure: 't_score',
            score: 2.295522,
          },
          {
            measure: 'log_likelihood',
            score: 33.206272,
          },
          {
            measure: 'simple_ll',
            score: 21.956974,
          },
          {
            measure: 'min_sensitivity',
            score: 0.000637,
          },
          {
            measure: 'liddell',
            score: 0.93718,
          },
          {
            measure: 'dice',
            score: 0.001274,
          },
          {
            measure: 'log_ratio',
            score: 16.449107,
          },
          {
            measure: 'conservative_log_ratio',
            score: 1.977904,
          },
          {
            measure: 'mutual_information',
            score: 1.201645,
          },
          {
            measure: 'local_mutual_information',
            score: 7.209872,
          },
          {
            measure: 'ipm',
            score: 637.213254,
          },
          {
            measure: 'ipm_reference',
            score: 0,
          },
          {
            measure: 'ipm_expected',
            score: 40.053405,
          },
        ],
      },
      {
        item: '[ CDU / CSU ]',
        raw_scores: [
          {
            measure: 'O11',
            score: 13,
          },
          {
            measure: 'O12',
            score: 9403,
          },
          {
            measure: 'O21',
            score: 0,
          },
          {
            measure: 'O22',
            score: 140384,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 13,
          },
          {
            measure: 'C2',
            score: 149787,
          },
          {
            measure: 'N',
            score: 149800,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 13,
          },
          {
            measure: 'O12',
            score: 9403,
          },
          {
            measure: 'O21',
            score: 0,
          },
          {
            measure: 'O22',
            score: 140384,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 13,
          },
          {
            measure: 'C2',
            score: 149787,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 0.817143,
          },
          {
            measure: 'E12',
            score: 9415.182857,
          },
          {
            measure: 'E21',
            score: 12.182857,
          },
          {
            measure: 'E22',
            score: 140371.817143,
          },
          {
            measure: 'z_score',
            score: 13.477215,
          },
          {
            measure: 't_score',
            score: 3.378917,
          },
          {
            measure: 'log_likelihood',
            score: 71.955986,
          },
          {
            measure: 'simple_ll',
            score: 47.573444,
          },
          {
            measure: 'min_sensitivity',
            score: 0.001381,
          },
          {
            measure: 'liddell',
            score: 0.937224,
          },
          {
            measure: 'dice',
            score: 0.002757,
          },
          {
            measure: 'log_ratio',
            score: 17.564455,
          },
          {
            measure: 'conservative_log_ratio',
            score: 3.814599,
          },
          {
            measure: 'mutual_information',
            score: 1.201645,
          },
          {
            measure: 'local_mutual_information',
            score: 15.62139,
          },
          {
            measure: 'ipm',
            score: 1380.628717,
          },
          {
            measure: 'ipm_reference',
            score: 0,
          },
          {
            measure: 'ipm_expected',
            score: 86.782377,
          },
        ],
      },
      {
        item: '[ CDU / CSU ]:',
        raw_scores: [
          {
            measure: 'O11',
            score: 176,
          },
          {
            measure: 'O12',
            score: 9240,
          },
          {
            measure: 'O21',
            score: 0,
          },
          {
            measure: 'O22',
            score: 140384,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 176,
          },
          {
            measure: 'C2',
            score: 149624,
          },
          {
            measure: 'N',
            score: 149800,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 176,
          },
          {
            measure: 'O12',
            score: 9240,
          },
          {
            measure: 'O21',
            score: 0,
          },
          {
            measure: 'O22',
            score: 140384,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 176,
          },
          {
            measure: 'C2',
            score: 149624,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 11.062857,
          },
          {
            measure: 'E12',
            score: 9404.937143,
          },
          {
            measure: 'E21',
            score: 164.937143,
          },
          {
            measure: 'E22',
            score: 140219.062857,
          },
          {
            measure: 'z_score',
            score: 49.588939,
          },
          {
            measure: 't_score',
            score: 12.432605,
          },
          {
            measure: 'log_likelihood',
            score: 977.049073,
          },
          {
            measure: 'simple_ll',
            score: 644.071241,
          },
          {
            measure: 'min_sensitivity',
            score: 0.018692,
          },
          {
            measure: 'liddell',
            score: 0.938245,
          },
          {
            measure: 'dice',
            score: 0.036697,
          },
          {
            measure: 'log_ratio',
            score: 21.323344,
          },
          {
            measure: 'conservative_log_ratio',
            score: 8.08735,
          },
          {
            measure: 'mutual_information',
            score: 1.201645,
          },
          {
            measure: 'local_mutual_information',
            score: 211.489584,
          },
          {
            measure: 'ipm',
            score: 18691.588785,
          },
          {
            measure: 'ipm_reference',
            score: 0,
          },
          {
            measure: 'ipm_expected',
            score: 1174.899866,
          },
        ],
      },
    ],
    unigram_item_scores: [
      {
        item: '/',
        raw_scores: [
          {
            measure: 'O11',
            score: 636,
          },
          {
            measure: 'O12',
            score: 8780,
          },
          {
            measure: 'O21',
            score: 0,
          },
          {
            measure: 'O22',
            score: 140384,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 636,
          },
          {
            measure: 'C2',
            score: 149164,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 39.977143,
          },
          {
            measure: 'E12',
            score: 9376.022857,
          },
          {
            measure: 'E21',
            score: 596.022857,
          },
          {
            measure: 'E22',
            score: 139787.977143,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 636,
          },
          {
            measure: 'E11',
            score: 39.977143,
          },
          {
            measure: 'z_score',
            score: 94.266425,
          },
          {
            measure: 't_score',
            score: 23.633844,
          },
          {
            measure: 'log_likelihood',
            score: 3560.740524,
          },
          {
            measure: 'simple_ll',
            score: 2327.439258,
          },
          {
            measure: 'min_sensitivity',
            score: 0.067545,
          },
          {
            measure: 'liddell',
            score: 0.941139,
          },
          {
            measure: 'dice',
            score: 0.126542,
          },
          {
            measure: 'log_ratio',
            score: 23.17679,
          },
          {
            measure: 'conservative_log_ratio',
            score: 9.945143,
          },
          {
            measure: 'mutual_information',
            score: 1.201645,
          },
          {
            measure: 'local_mutual_information',
            score: 764.246451,
          },
          {
            measure: 'ipm',
            score: 67544.604928,
          },
          {
            measure: 'ipm_reference',
            score: 0,
          },
          {
            measure: 'ipm_expected',
            score: 4245.660881,
          },
        ],
      },
      {
        item: 'CDU',
        raw_scores: [
          {
            measure: 'O11',
            score: 650,
          },
          {
            measure: 'O12',
            score: 8766,
          },
          {
            measure: 'O21',
            score: 0,
          },
          {
            measure: 'O22',
            score: 140384,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 650,
          },
          {
            measure: 'C2',
            score: 149150,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 40.857143,
          },
          {
            measure: 'E12',
            score: 9375.142857,
          },
          {
            measure: 'E21',
            score: 609.142857,
          },
          {
            measure: 'E22',
            score: 139774.857143,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 650,
          },
          {
            measure: 'E11',
            score: 40.857143,
          },
          {
            measure: 'z_score',
            score: 95.298301,
          },
          {
            measure: 't_score',
            score: 23.892549,
          },
          {
            measure: 'log_likelihood',
            score: 3640.073504,
          },
          {
            measure: 'simple_ll',
            score: 2378.672197,
          },
          {
            measure: 'min_sensitivity',
            score: 0.069031,
          },
          {
            measure: 'liddell',
            score: 0.941227,
          },
          {
            measure: 'dice',
            score: 0.129148,
          },
          {
            measure: 'log_ratio',
            score: 23.208203,
          },
          {
            measure: 'conservative_log_ratio',
            score: 9.976789,
          },
          {
            measure: 'mutual_information',
            score: 1.201645,
          },
          {
            measure: 'local_mutual_information',
            score: 781.069486,
          },
          {
            measure: 'ipm',
            score: 69031.435854,
          },
          {
            measure: 'ipm_reference',
            score: 0,
          },
          {
            measure: 'ipm_expected',
            score: 4339.118825,
          },
        ],
      },
      {
        item: 'CSU',
        raw_scores: [
          {
            measure: 'O11',
            score: 635,
          },
          {
            measure: 'O12',
            score: 8781,
          },
          {
            measure: 'O21',
            score: 0,
          },
          {
            measure: 'O22',
            score: 140384,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 635,
          },
          {
            measure: 'C2',
            score: 149165,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 39.914286,
          },
          {
            measure: 'E12',
            score: 9376.085714,
          },
          {
            measure: 'E21',
            score: 595.085714,
          },
          {
            measure: 'E22',
            score: 139788.914286,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 635,
          },
          {
            measure: 'E11',
            score: 39.914286,
          },
          {
            measure: 'z_score',
            score: 94.192287,
          },
          {
            measure: 't_score',
            score: 23.615256,
          },
          {
            measure: 'log_likelihood',
            score: 3555.075491,
          },
          {
            measure: 'simple_ll',
            score: 2323.779762,
          },
          {
            measure: 'min_sensitivity',
            score: 0.067438,
          },
          {
            measure: 'liddell',
            score: 0.941132,
          },
          {
            measure: 'dice',
            score: 0.126356,
          },
          {
            measure: 'log_ratio',
            score: 23.17452,
          },
          {
            measure: 'conservative_log_ratio',
            score: 9.942855,
          },
          {
            measure: 'mutual_information',
            score: 1.201645,
          },
          {
            measure: 'local_mutual_information',
            score: 763.044806,
          },
          {
            measure: 'ipm',
            score: 67438.402719,
          },
          {
            measure: 'ipm_reference',
            score: 0,
          },
          {
            measure: 'ipm_expected',
            score: 4238.985314,
          },
        ],
      },
      {
        item: 'CSU-Fraktion',
        raw_scores: [
          {
            measure: 'O11',
            score: 7,
          },
          {
            measure: 'O12',
            score: 9409,
          },
          {
            measure: 'O21',
            score: 0,
          },
          {
            measure: 'O22',
            score: 140384,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 7,
          },
          {
            measure: 'C2',
            score: 149793,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 0.44,
          },
          {
            measure: 'E12',
            score: 9415.56,
          },
          {
            measure: 'E21',
            score: 6.56,
          },
          {
            measure: 'E22',
            score: 140377.44,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 7,
          },
          {
            measure: 'E11',
            score: 0.44,
          },
          {
            measure: 'z_score',
            score: 9.889572,
          },
          {
            measure: 't_score',
            score: 2.479447,
          },
          {
            measure: 'log_likelihood',
            score: 38.741348,
          },
          {
            measure: 'simple_ll',
            score: 25.61647,
          },
          {
            measure: 'min_sensitivity',
            score: 0.000743,
          },
          {
            measure: 'liddell',
            score: 0.937187,
          },
          {
            measure: 'dice',
            score: 0.001486,
          },
          {
            measure: 'log_ratio',
            score: 16.671466,
          },
          {
            measure: 'conservative_log_ratio',
            score: 2.356533,
          },
          {
            measure: 'mutual_information',
            score: 1.201645,
          },
          {
            measure: 'local_mutual_information',
            score: 8.411518,
          },
          {
            measure: 'ipm',
            score: 743.415463,
          },
          {
            measure: 'ipm_reference',
            score: 0,
          },
          {
            measure: 'ipm_expected',
            score: 46.728972,
          },
        ],
      },
      {
        item: '[',
        raw_scores: [
          {
            measure: 'O11',
            score: 189,
          },
          {
            measure: 'O12',
            score: 9227,
          },
          {
            measure: 'O21',
            score: 0,
          },
          {
            measure: 'O22',
            score: 140384,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 189,
          },
          {
            measure: 'C2',
            score: 149611,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 11.88,
          },
          {
            measure: 'E12',
            score: 9404.12,
          },
          {
            measure: 'E21',
            score: 177.12,
          },
          {
            measure: 'E22',
            score: 140206.88,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 189,
          },
          {
            measure: 'E11',
            score: 11.88,
          },
          {
            measure: 'z_score',
            score: 51.387724,
          },
          {
            measure: 't_score',
            score: 12.883584,
          },
          {
            measure: 'log_likelihood',
            score: 1049.465416,
          },
          {
            measure: 'simple_ll',
            score: 691.644685,
          },
          {
            measure: 'min_sensitivity',
            score: 0.020072,
          },
          {
            measure: 'liddell',
            score: 0.938327,
          },
          {
            measure: 'dice',
            score: 0.039355,
          },
          {
            measure: 'log_ratio',
            score: 21.426155,
          },
          {
            measure: 'conservative_log_ratio',
            score: 8.168753,
          },
          {
            measure: 'mutual_information',
            score: 1.201645,
          },
          {
            measure: 'local_mutual_information',
            score: 227.110974,
          },
          {
            measure: 'ipm',
            score: 20072.217502,
          },
          {
            measure: 'ipm_reference',
            score: 0,
          },
          {
            measure: 'ipm_expected',
            score: 1261.682243,
          },
        ],
      },
      {
        item: ']',
        raw_scores: [
          {
            measure: 'O11',
            score: 13,
          },
          {
            measure: 'O12',
            score: 9403,
          },
          {
            measure: 'O21',
            score: 0,
          },
          {
            measure: 'O22',
            score: 140384,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 13,
          },
          {
            measure: 'C2',
            score: 149787,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 0.817143,
          },
          {
            measure: 'E12',
            score: 9415.182857,
          },
          {
            measure: 'E21',
            score: 12.182857,
          },
          {
            measure: 'E22',
            score: 140371.817143,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 13,
          },
          {
            measure: 'E11',
            score: 0.817143,
          },
          {
            measure: 'z_score',
            score: 13.477215,
          },
          {
            measure: 't_score',
            score: 3.378917,
          },
          {
            measure: 'log_likelihood',
            score: 71.955986,
          },
          {
            measure: 'simple_ll',
            score: 47.573444,
          },
          {
            measure: 'min_sensitivity',
            score: 0.001381,
          },
          {
            measure: 'liddell',
            score: 0.937224,
          },
          {
            measure: 'dice',
            score: 0.002757,
          },
          {
            measure: 'log_ratio',
            score: 17.564455,
          },
          {
            measure: 'conservative_log_ratio',
            score: 3.781531,
          },
          {
            measure: 'mutual_information',
            score: 1.201645,
          },
          {
            measure: 'local_mutual_information',
            score: 15.62139,
          },
          {
            measure: 'ipm',
            score: 1380.628717,
          },
          {
            measure: 'ipm_reference',
            score: 0,
          },
          {
            measure: 'ipm_expected',
            score: 86.782377,
          },
        ],
      },
      {
        item: ']:',
        raw_scores: [
          {
            measure: 'O11',
            score: 176,
          },
          {
            measure: 'O12',
            score: 9240,
          },
          {
            measure: 'O21',
            score: 0,
          },
          {
            measure: 'O22',
            score: 140384,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 176,
          },
          {
            measure: 'C2',
            score: 149624,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 11.062857,
          },
          {
            measure: 'E12',
            score: 9404.937143,
          },
          {
            measure: 'E21',
            score: 164.937143,
          },
          {
            measure: 'E22',
            score: 140219.062857,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 176,
          },
          {
            measure: 'E11',
            score: 11.062857,
          },
          {
            measure: 'z_score',
            score: 49.588939,
          },
          {
            measure: 't_score',
            score: 12.432605,
          },
          {
            measure: 'log_likelihood',
            score: 977.049073,
          },
          {
            measure: 'simple_ll',
            score: 644.071241,
          },
          {
            measure: 'min_sensitivity',
            score: 0.018692,
          },
          {
            measure: 'liddell',
            score: 0.938245,
          },
          {
            measure: 'dice',
            score: 0.036697,
          },
          {
            measure: 'log_ratio',
            score: 21.323344,
          },
          {
            measure: 'conservative_log_ratio',
            score: 8.063228,
          },
          {
            measure: 'mutual_information',
            score: 1.201645,
          },
          {
            measure: 'local_mutual_information',
            score: 211.489584,
          },
          {
            measure: 'ipm',
            score: 18691.588785,
          },
          {
            measure: 'ipm_reference',
            score: 0,
          },
          {
            measure: 'ipm_expected',
            score: 1174.899866,
          },
        ],
      },
    ],
  },
  {
    discourseme_id: 14,
    global_scores: [
      {
        measure: 'discourseme_id',
        score: 14,
      },
      {
        measure: 'O11',
        score: 292,
      },
      {
        measure: 'O12',
        score: 9124,
      },
      {
        measure: 'O21',
        score: 209,
      },
      {
        measure: 'O22',
        score: 140175,
      },
      {
        measure: 'R1',
        score: 9416,
      },
      {
        measure: 'R2',
        score: 140384,
      },
      {
        measure: 'C1',
        score: 501,
      },
      {
        measure: 'C2',
        score: 149299,
      },
      {
        measure: 'N',
        score: 149800,
      },
      {
        measure: 'E11',
        score: 31.491429,
      },
      {
        measure: 'E12',
        score: 9384.508571,
      },
      {
        measure: 'E21',
        score: 469.508571,
      },
      {
        measure: 'E22',
        score: 139914.491429,
      },
      {
        measure: 'z_score',
        score: 46.422213,
      },
      {
        measure: 't_score',
        score: 15.245111,
      },
      {
        measure: 'log_likelihood',
        score: 970.065335,
      },
      {
        measure: 'simple_ll',
        score: 779.573284,
      },
      {
        measure: 'min_sensitivity',
        score: 0.031011,
      },
      {
        measure: 'liddell',
        score: 0.521722,
      },
      {
        measure: 'dice',
        score: 0.058889,
      },
      {
        measure: 'log_ratio',
        score: 4.380584,
      },
      {
        measure: 'conservative_log_ratio',
        score: 3.947283,
      },
      {
        measure: 'mutual_information',
        score: 0.96719,
      },
      {
        measure: 'local_mutual_information',
        score: 282.419623,
      },
      {
        measure: 'ipm',
        score: 31011.04503,
      },
      {
        measure: 'ipm_reference',
        score: 1488.773649,
      },
      {
        measure: 'ipm_expected',
        score: 3344.459279,
      },
    ],
    item_scores: [
      {
        item: 'F. D. P.',
        raw_scores: [
          {
            measure: 'O11',
            score: 285,
          },
          {
            measure: 'O12',
            score: 9131,
          },
          {
            measure: 'O21',
            score: 112,
          },
          {
            measure: 'O22',
            score: 140272,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 397,
          },
          {
            measure: 'C2',
            score: 149403,
          },
          {
            measure: 'N',
            score: 149800,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 285,
          },
          {
            measure: 'O12',
            score: 9131,
          },
          {
            measure: 'O21',
            score: 112,
          },
          {
            measure: 'O22',
            score: 140272,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 397,
          },
          {
            measure: 'C2',
            score: 149403,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 24.954286,
          },
          {
            measure: 'E12',
            score: 9391.045714,
          },
          {
            measure: 'E21',
            score: 372.045714,
          },
          {
            measure: 'E22',
            score: 140011.954286,
          },
          {
            measure: 'z_score',
            score: 52.056759,
          },
          {
            measure: 't_score',
            score: 15.403779,
          },
          {
            measure: 'log_likelihood',
            score: 1127.037818,
          },
          {
            measure: 'simple_ll',
            score: 868.111424,
          },
          {
            measure: 'min_sensitivity',
            score: 0.030268,
          },
          {
            measure: 'liddell',
            score: 0.656768,
          },
          {
            measure: 'dice',
            score: 0.058086,
          },
          {
            measure: 'log_ratio',
            score: 5.245576,
          },
          {
            measure: 'conservative_log_ratio',
            score: 4.673959,
          },
          {
            measure: 'mutual_information',
            score: 1.0577,
          },
          {
            measure: 'local_mutual_information',
            score: 301.444419,
          },
          {
            measure: 'ipm',
            score: 30267.629567,
          },
          {
            measure: 'ipm_reference',
            score: 797.811716,
          },
          {
            measure: 'ipm_expected',
            score: 2650.200267,
          },
        ],
      },
      {
        item: '[ F. D. P. ]',
        raw_scores: [
          {
            measure: 'O11',
            score: 5,
          },
          {
            measure: 'O12',
            score: 9411,
          },
          {
            measure: 'O21',
            score: 9,
          },
          {
            measure: 'O22',
            score: 140375,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 14,
          },
          {
            measure: 'C2',
            score: 149786,
          },
          {
            measure: 'N',
            score: 149800,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 5,
          },
          {
            measure: 'O12',
            score: 9411,
          },
          {
            measure: 'O21',
            score: 9,
          },
          {
            measure: 'O22',
            score: 140375,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 14,
          },
          {
            measure: 'C2',
            score: 149786,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 0.88,
          },
          {
            measure: 'E12',
            score: 9415.12,
          },
          {
            measure: 'E21',
            score: 13.12,
          },
          {
            measure: 'E22',
            score: 140370.88,
          },
          {
            measure: 'z_score',
            score: 4.391935,
          },
          {
            measure: 't_score',
            score: 1.84252,
          },
          {
            measure: 'log_likelihood',
            score: 10.590199,
          },
          {
            measure: 'simple_ll',
            score: 9.132713,
          },
          {
            measure: 'min_sensitivity',
            score: 0.000531,
          },
          {
            measure: 'liddell',
            score: 0.294313,
          },
          {
            measure: 'dice',
            score: 0.00106,
          },
          {
            measure: 'log_ratio',
            score: 3.050252,
          },
          {
            measure: 'conservative_log_ratio',
            score: 0,
          },
          {
            measure: 'mutual_information',
            score: 0.754487,
          },
          {
            measure: 'local_mutual_information',
            score: 3.772437,
          },
          {
            measure: 'ipm',
            score: 531.011045,
          },
          {
            measure: 'ipm_reference',
            score: 64.10987,
          },
          {
            measure: 'ipm_expected',
            score: 93.457944,
          },
        ],
      },
      {
        item: '[ F. D. P. ]:',
        raw_scores: [
          {
            measure: 'O11',
            score: 2,
          },
          {
            measure: 'O12',
            score: 9414,
          },
          {
            measure: 'O21',
            score: 88,
          },
          {
            measure: 'O22',
            score: 140296,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 90,
          },
          {
            measure: 'C2',
            score: 149710,
          },
          {
            measure: 'N',
            score: 149800,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 2,
          },
          {
            measure: 'O12',
            score: 9414,
          },
          {
            measure: 'O21',
            score: 88,
          },
          {
            measure: 'O22',
            score: 140296,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 90,
          },
          {
            measure: 'C2',
            score: 149710,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 5.657143,
          },
          {
            measure: 'E12',
            score: 9410.342857,
          },
          {
            measure: 'E21',
            score: 84.342857,
          },
          {
            measure: 'E22',
            score: 140299.657143,
          },
          {
            measure: 'z_score',
            score: -1.5376,
          },
          {
            measure: 't_score',
            score: -2.585991,
          },
          {
            measure: 'log_likelihood',
            score: -3.313047,
          },
          {
            measure: 'simple_ll',
            score: -3.155199,
          },
          {
            measure: 'min_sensitivity',
            score: 0.000212,
          },
          {
            measure: 'liddell',
            score: -0.040659,
          },
          {
            measure: 'dice',
            score: 0.000421,
          },
          {
            measure: 'log_ratio',
            score: -1.560607,
          },
          {
            measure: 'conservative_log_ratio',
            score: 0,
          },
          {
            measure: 'mutual_information',
            score: -0.451567,
          },
          {
            measure: 'local_mutual_information',
            score: -0.903134,
          },
          {
            measure: 'ipm',
            score: 212.404418,
          },
          {
            measure: 'ipm_reference',
            score: 626.852063,
          },
          {
            measure: 'ipm_expected',
            score: 600.801068,
          },
        ],
      },
    ],
    unigram_item_scores: [
      {
        item: 'D.',
        raw_scores: [
          {
            measure: 'O11',
            score: 292,
          },
          {
            measure: 'O12',
            score: 9124,
          },
          {
            measure: 'O21',
            score: 209,
          },
          {
            measure: 'O22',
            score: 140175,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 501,
          },
          {
            measure: 'C2',
            score: 149299,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 31.491429,
          },
          {
            measure: 'E12',
            score: 9384.508571,
          },
          {
            measure: 'E21',
            score: 469.508571,
          },
          {
            measure: 'E22',
            score: 139914.491429,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 292,
          },
          {
            measure: 'E11',
            score: 31.491429,
          },
          {
            measure: 'z_score',
            score: 46.422213,
          },
          {
            measure: 't_score',
            score: 15.245111,
          },
          {
            measure: 'log_likelihood',
            score: 970.065335,
          },
          {
            measure: 'simple_ll',
            score: 779.573284,
          },
          {
            measure: 'min_sensitivity',
            score: 0.031011,
          },
          {
            measure: 'liddell',
            score: 0.521722,
          },
          {
            measure: 'dice',
            score: 0.058889,
          },
          {
            measure: 'log_ratio',
            score: 4.380584,
          },
          {
            measure: 'conservative_log_ratio',
            score: 3.886022,
          },
          {
            measure: 'mutual_information',
            score: 0.96719,
          },
          {
            measure: 'local_mutual_information',
            score: 282.419623,
          },
          {
            measure: 'ipm',
            score: 31011.04503,
          },
          {
            measure: 'ipm_reference',
            score: 1488.773649,
          },
          {
            measure: 'ipm_expected',
            score: 3344.459279,
          },
        ],
      },
      {
        item: 'F.',
        raw_scores: [
          {
            measure: 'O11',
            score: 292,
          },
          {
            measure: 'O12',
            score: 9124,
          },
          {
            measure: 'O21',
            score: 209,
          },
          {
            measure: 'O22',
            score: 140175,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 501,
          },
          {
            measure: 'C2',
            score: 149299,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 31.491429,
          },
          {
            measure: 'E12',
            score: 9384.508571,
          },
          {
            measure: 'E21',
            score: 469.508571,
          },
          {
            measure: 'E22',
            score: 139914.491429,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 292,
          },
          {
            measure: 'E11',
            score: 31.491429,
          },
          {
            measure: 'z_score',
            score: 46.422213,
          },
          {
            measure: 't_score',
            score: 15.245111,
          },
          {
            measure: 'log_likelihood',
            score: 970.065335,
          },
          {
            measure: 'simple_ll',
            score: 779.573284,
          },
          {
            measure: 'min_sensitivity',
            score: 0.031011,
          },
          {
            measure: 'liddell',
            score: 0.521722,
          },
          {
            measure: 'dice',
            score: 0.058889,
          },
          {
            measure: 'log_ratio',
            score: 4.380584,
          },
          {
            measure: 'conservative_log_ratio',
            score: 3.886022,
          },
          {
            measure: 'mutual_information',
            score: 0.96719,
          },
          {
            measure: 'local_mutual_information',
            score: 282.419623,
          },
          {
            measure: 'ipm',
            score: 31011.04503,
          },
          {
            measure: 'ipm_reference',
            score: 1488.773649,
          },
          {
            measure: 'ipm_expected',
            score: 3344.459279,
          },
        ],
      },
      {
        item: 'P.',
        raw_scores: [
          {
            measure: 'O11',
            score: 292,
          },
          {
            measure: 'O12',
            score: 9124,
          },
          {
            measure: 'O21',
            score: 209,
          },
          {
            measure: 'O22',
            score: 140175,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 501,
          },
          {
            measure: 'C2',
            score: 149299,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 31.491429,
          },
          {
            measure: 'E12',
            score: 9384.508571,
          },
          {
            measure: 'E21',
            score: 469.508571,
          },
          {
            measure: 'E22',
            score: 139914.491429,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 292,
          },
          {
            measure: 'E11',
            score: 31.491429,
          },
          {
            measure: 'z_score',
            score: 46.422213,
          },
          {
            measure: 't_score',
            score: 15.245111,
          },
          {
            measure: 'log_likelihood',
            score: 970.065335,
          },
          {
            measure: 'simple_ll',
            score: 779.573284,
          },
          {
            measure: 'min_sensitivity',
            score: 0.031011,
          },
          {
            measure: 'liddell',
            score: 0.521722,
          },
          {
            measure: 'dice',
            score: 0.058889,
          },
          {
            measure: 'log_ratio',
            score: 4.380584,
          },
          {
            measure: 'conservative_log_ratio',
            score: 3.886022,
          },
          {
            measure: 'mutual_information',
            score: 0.96719,
          },
          {
            measure: 'local_mutual_information',
            score: 282.419623,
          },
          {
            measure: 'ipm',
            score: 31011.04503,
          },
          {
            measure: 'ipm_reference',
            score: 1488.773649,
          },
          {
            measure: 'ipm_expected',
            score: 3344.459279,
          },
        ],
      },
      {
        item: '[',
        raw_scores: [
          {
            measure: 'O11',
            score: 7,
          },
          {
            measure: 'O12',
            score: 9409,
          },
          {
            measure: 'O21',
            score: 97,
          },
          {
            measure: 'O22',
            score: 140287,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 104,
          },
          {
            measure: 'C2',
            score: 149696,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 6.537143,
          },
          {
            measure: 'E12',
            score: 9409.462857,
          },
          {
            measure: 'E21',
            score: 97.462857,
          },
          {
            measure: 'E22',
            score: 140286.537143,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 7,
          },
          {
            measure: 'E11',
            score: 6.537143,
          },
          {
            measure: 'z_score',
            score: 0.181031,
          },
          {
            measure: 't_score',
            score: 0.174944,
          },
          {
            measure: 'log_likelihood',
            score: 0.034251,
          },
          {
            measure: 'simple_ll',
            score: 0.032025,
          },
          {
            measure: 'min_sensitivity',
            score: 0.000743,
          },
          {
            measure: 'liddell',
            score: 0.004454,
          },
          {
            measure: 'dice',
            score: 0.001471,
          },
          {
            measure: 'log_ratio',
            score: 0.105754,
          },
          {
            measure: 'conservative_log_ratio',
            score: 0,
          },
          {
            measure: 'mutual_information',
            score: 0.02971,
          },
          {
            measure: 'local_mutual_information',
            score: 0.20797,
          },
          {
            measure: 'ipm',
            score: 743.415463,
          },
          {
            measure: 'ipm_reference',
            score: 690.961933,
          },
          {
            measure: 'ipm_expected',
            score: 694.259012,
          },
        ],
      },
      {
        item: ']',
        raw_scores: [
          {
            measure: 'O11',
            score: 5,
          },
          {
            measure: 'O12',
            score: 9411,
          },
          {
            measure: 'O21',
            score: 9,
          },
          {
            measure: 'O22',
            score: 140375,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 14,
          },
          {
            measure: 'C2',
            score: 149786,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 0.88,
          },
          {
            measure: 'E12',
            score: 9415.12,
          },
          {
            measure: 'E21',
            score: 13.12,
          },
          {
            measure: 'E22',
            score: 140370.88,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 5,
          },
          {
            measure: 'E11',
            score: 0.88,
          },
          {
            measure: 'z_score',
            score: 4.391935,
          },
          {
            measure: 't_score',
            score: 1.84252,
          },
          {
            measure: 'log_likelihood',
            score: 10.590199,
          },
          {
            measure: 'simple_ll',
            score: 9.132713,
          },
          {
            measure: 'min_sensitivity',
            score: 0.000531,
          },
          {
            measure: 'liddell',
            score: 0.294313,
          },
          {
            measure: 'dice',
            score: 0.00106,
          },
          {
            measure: 'log_ratio',
            score: 3.050252,
          },
          {
            measure: 'conservative_log_ratio',
            score: 0,
          },
          {
            measure: 'mutual_information',
            score: 0.754487,
          },
          {
            measure: 'local_mutual_information',
            score: 3.772437,
          },
          {
            measure: 'ipm',
            score: 531.011045,
          },
          {
            measure: 'ipm_reference',
            score: 64.10987,
          },
          {
            measure: 'ipm_expected',
            score: 93.457944,
          },
        ],
      },
      {
        item: ']:',
        raw_scores: [
          {
            measure: 'O11',
            score: 2,
          },
          {
            measure: 'O12',
            score: 9414,
          },
          {
            measure: 'O21',
            score: 88,
          },
          {
            measure: 'O22',
            score: 140296,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 90,
          },
          {
            measure: 'C2',
            score: 149710,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 5.657143,
          },
          {
            measure: 'E12',
            score: 9410.342857,
          },
          {
            measure: 'E21',
            score: 84.342857,
          },
          {
            measure: 'E22',
            score: 140299.657143,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 2,
          },
          {
            measure: 'E11',
            score: 5.657143,
          },
          {
            measure: 'z_score',
            score: -1.5376,
          },
          {
            measure: 't_score',
            score: -2.585991,
          },
          {
            measure: 'log_likelihood',
            score: -3.313047,
          },
          {
            measure: 'simple_ll',
            score: -3.155199,
          },
          {
            measure: 'min_sensitivity',
            score: 0.000212,
          },
          {
            measure: 'liddell',
            score: -0.040659,
          },
          {
            measure: 'dice',
            score: 0.000421,
          },
          {
            measure: 'log_ratio',
            score: -1.560607,
          },
          {
            measure: 'conservative_log_ratio',
            score: 0,
          },
          {
            measure: 'mutual_information',
            score: -0.451567,
          },
          {
            measure: 'local_mutual_information',
            score: -0.903134,
          },
          {
            measure: 'ipm',
            score: 212.404418,
          },
          {
            measure: 'ipm_reference',
            score: 626.852063,
          },
          {
            measure: 'ipm_expected',
            score: 600.801068,
          },
        ],
      },
    ],
  },
  {
    discourseme_id: 15,
    global_scores: [
      {
        measure: 'discourseme_id',
        score: 15,
      },
      {
        measure: 'O11',
        score: 1,
      },
      {
        measure: 'O12',
        score: 9415,
      },
      {
        measure: 'O21',
        score: 57,
      },
      {
        measure: 'O22',
        score: 140327,
      },
      {
        measure: 'R1',
        score: 9416,
      },
      {
        measure: 'R2',
        score: 140384,
      },
      {
        measure: 'C1',
        score: 58,
      },
      {
        measure: 'C2',
        score: 149742,
      },
      {
        measure: 'N',
        score: 149800,
      },
      {
        measure: 'E11',
        score: 3.645714,
      },
      {
        measure: 'E12',
        score: 9412.354286,
      },
      {
        measure: 'E21',
        score: 54.354286,
      },
      {
        measure: 'E22',
        score: 140329.645714,
      },
      {
        measure: 'z_score',
        score: -1.385644,
      },
      {
        measure: 't_score',
        score: -2.645714,
      },
      {
        measure: 'log_likelihood',
        score: -2.831858,
      },
      {
        measure: 'simple_ll',
        score: -2.704324,
      },
      {
        measure: 'min_sensitivity',
        score: 0.000106,
      },
      {
        measure: 'liddell',
        score: -0.045633,
      },
      {
        measure: 'dice',
        score: 0.000211,
      },
      {
        measure: 'log_ratio',
        score: -1.933353,
      },
      {
        measure: 'conservative_log_ratio',
        score: 0,
      },
      {
        measure: 'mutual_information',
        score: -0.561783,
      },
      {
        measure: 'local_mutual_information',
        score: -0.561783,
      },
      {
        measure: 'ipm',
        score: 106.202209,
      },
      {
        measure: 'ipm_reference',
        score: 406.029177,
      },
      {
        measure: 'ipm_expected',
        score: 387.182911,
      },
    ],
    item_scores: [
      {
        item: 'Bundeskanzler',
        raw_scores: [
          {
            measure: 'O11',
            score: 1,
          },
          {
            measure: 'O12',
            score: 9415,
          },
          {
            measure: 'O21',
            score: 52,
          },
          {
            measure: 'O22',
            score: 140332,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 53,
          },
          {
            measure: 'C2',
            score: 149747,
          },
          {
            measure: 'N',
            score: 149800,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 1,
          },
          {
            measure: 'O12',
            score: 9415,
          },
          {
            measure: 'O21',
            score: 52,
          },
          {
            measure: 'O22',
            score: 140332,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 53,
          },
          {
            measure: 'C2',
            score: 149747,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 3.331429,
          },
          {
            measure: 'E12',
            score: 9412.668571,
          },
          {
            measure: 'E21',
            score: 49.668571,
          },
          {
            measure: 'E22',
            score: 140334.331429,
          },
          {
            measure: 'z_score',
            score: -1.277341,
          },
          {
            measure: 't_score',
            score: -2.331429,
          },
          {
            measure: 'log_likelihood',
            score: -2.364434,
          },
          {
            measure: 'simple_ll',
            score: -2.256055,
          },
          {
            measure: 'min_sensitivity',
            score: 0.000106,
          },
          {
            measure: 'liddell',
            score: -0.044005,
          },
          {
            measure: 'dice',
            score: 0.000211,
          },
          {
            measure: 'log_ratio',
            score: -1.800905,
          },
          {
            measure: 'conservative_log_ratio',
            score: 0,
          },
          {
            measure: 'mutual_information',
            score: -0.522631,
          },
          {
            measure: 'local_mutual_information',
            score: -0.522631,
          },
          {
            measure: 'ipm',
            score: 106.202209,
          },
          {
            measure: 'ipm_reference',
            score: 370.412583,
          },
          {
            measure: 'ipm_expected',
            score: 353.805073,
          },
        ],
      },
      {
        item: 'Kanzler',
        raw_scores: [
          {
            measure: 'O11',
            score: 0,
          },
          {
            measure: 'O12',
            score: 9416,
          },
          {
            measure: 'O21',
            score: 5,
          },
          {
            measure: 'O22',
            score: 140379,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 5,
          },
          {
            measure: 'C2',
            score: 149795,
          },
          {
            measure: 'N',
            score: 149800,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 0,
          },
          {
            measure: 'O12',
            score: 9416,
          },
          {
            measure: 'O21',
            score: 5,
          },
          {
            measure: 'O22',
            score: 140379,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 5,
          },
          {
            measure: 'C2',
            score: 149795,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 0.314286,
          },
          {
            measure: 'E12',
            score: 9415.685714,
          },
          {
            measure: 'E21',
            score: 4.685714,
          },
          {
            measure: 'E22',
            score: 140379.314286,
          },
          {
            measure: 'z_score',
            score: -0.560612,
          },
          {
            measure: 't_score',
            score: -9.938587,
          },
          {
            measure: 'log_likelihood',
            score: -0.649207,
          },
          {
            measure: 'simple_ll',
            score: -0.628571,
          },
          {
            measure: 'min_sensitivity',
            score: 0,
          },
          {
            measure: 'liddell',
            score: -0.062859,
          },
          {
            measure: 'dice',
            score: 0,
          },
          {
            measure: 'log_ratio',
            score: -8.389881,
          },
          {
            measure: 'conservative_log_ratio',
            score: 0,
          },
          {
            measure: 'mutual_information',
            score: -2.497325,
          },
          {
            measure: 'local_mutual_information',
            score: 0,
          },
          {
            measure: 'ipm',
            score: 0,
          },
          {
            measure: 'ipm_reference',
            score: 35.616594,
          },
          {
            measure: 'ipm_expected',
            score: 33.377837,
          },
        ],
      },
    ],
    unigram_item_scores: [
      {
        item: 'Bundeskanzler',
        raw_scores: [
          {
            measure: 'O11',
            score: 1,
          },
          {
            measure: 'O12',
            score: 9415,
          },
          {
            measure: 'O21',
            score: 52,
          },
          {
            measure: 'O22',
            score: 140332,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 53,
          },
          {
            measure: 'C2',
            score: 149747,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 3.331429,
          },
          {
            measure: 'E12',
            score: 9412.668571,
          },
          {
            measure: 'E21',
            score: 49.668571,
          },
          {
            measure: 'E22',
            score: 140334.331429,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 1,
          },
          {
            measure: 'E11',
            score: 3.331429,
          },
          {
            measure: 'z_score',
            score: -1.277341,
          },
          {
            measure: 't_score',
            score: -2.331429,
          },
          {
            measure: 'log_likelihood',
            score: -2.364434,
          },
          {
            measure: 'simple_ll',
            score: -2.256055,
          },
          {
            measure: 'min_sensitivity',
            score: 0.000106,
          },
          {
            measure: 'liddell',
            score: -0.044005,
          },
          {
            measure: 'dice',
            score: 0.000211,
          },
          {
            measure: 'log_ratio',
            score: -1.800905,
          },
          {
            measure: 'conservative_log_ratio',
            score: 0,
          },
          {
            measure: 'mutual_information',
            score: -0.522631,
          },
          {
            measure: 'local_mutual_information',
            score: -0.522631,
          },
          {
            measure: 'ipm',
            score: 106.202209,
          },
          {
            measure: 'ipm_reference',
            score: 370.412583,
          },
          {
            measure: 'ipm_expected',
            score: 353.805073,
          },
        ],
      },
      {
        item: 'Kanzler',
        raw_scores: [
          {
            measure: 'O11',
            score: 0,
          },
          {
            measure: 'O12',
            score: 9416,
          },
          {
            measure: 'O21',
            score: 5,
          },
          {
            measure: 'O22',
            score: 140379,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 5,
          },
          {
            measure: 'C2',
            score: 149795,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 0.314286,
          },
          {
            measure: 'E12',
            score: 9415.685714,
          },
          {
            measure: 'E21',
            score: 4.685714,
          },
          {
            measure: 'E22',
            score: 140379.314286,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 0,
          },
          {
            measure: 'E11',
            score: 0.314286,
          },
          {
            measure: 'z_score',
            score: -0.560612,
          },
          {
            measure: 't_score',
            score: -9.938587,
          },
          {
            measure: 'log_likelihood',
            score: -0.649207,
          },
          {
            measure: 'simple_ll',
            score: -0.628571,
          },
          {
            measure: 'min_sensitivity',
            score: 0,
          },
          {
            measure: 'liddell',
            score: -0.062859,
          },
          {
            measure: 'dice',
            score: 0,
          },
          {
            measure: 'log_ratio',
            score: -8.389881,
          },
          {
            measure: 'conservative_log_ratio',
            score: 0,
          },
          {
            measure: 'mutual_information',
            score: -2.497325,
          },
          {
            measure: 'local_mutual_information',
            score: 0,
          },
          {
            measure: 'ipm',
            score: 0,
          },
          {
            measure: 'ipm_reference',
            score: 35.616594,
          },
          {
            measure: 'ipm_expected',
            score: 33.377837,
          },
        ],
      },
    ],
  },
  {
    discourseme_id: 16,
    global_scores: [
      {
        measure: 'discourseme_id',
        score: 16,
      },
      {
        measure: 'O11',
        score: 364,
      },
      {
        measure: 'O12',
        score: 9052,
      },
      {
        measure: 'O21',
        score: 390,
      },
      {
        measure: 'O22',
        score: 139994,
      },
      {
        measure: 'R1',
        score: 9416,
      },
      {
        measure: 'R2',
        score: 140384,
      },
      {
        measure: 'C1',
        score: 754,
      },
      {
        measure: 'C2',
        score: 149046,
      },
      {
        measure: 'N',
        score: 149800,
      },
      {
        measure: 'E11',
        score: 47.394286,
      },
      {
        measure: 'E12',
        score: 9368.605714,
      },
      {
        measure: 'E21',
        score: 706.605714,
      },
      {
        measure: 'E22',
        score: 139677.394286,
      },
      {
        measure: 'z_score',
        score: 45.98919,
      },
      {
        measure: 't_score',
        score: 16.594648,
      },
      {
        measure: 'log_likelihood',
        score: 1032.103646,
      },
      {
        measure: 'simple_ll',
        score: 850.927374,
      },
      {
        measure: 'min_sensitivity',
        score: 0.038658,
      },
      {
        measure: 'liddell',
        score: 0.422026,
      },
      {
        measure: 'dice',
        score: 0.071583,
      },
      {
        measure: 'log_ratio',
        score: 3.798585,
      },
      {
        measure: 'conservative_log_ratio',
        score: 3.448015,
      },
      {
        measure: 'mutual_information',
        score: 0.885375,
      },
      {
        measure: 'local_mutual_information',
        score: 322.276646,
      },
      {
        measure: 'ipm',
        score: 38657.604078,
      },
      {
        measure: 'ipm_reference',
        score: 2778.09437,
      },
      {
        measure: 'ipm_expected',
        score: 5033.377837,
      },
    ],
    item_scores: [
      {
        item: 'Beifall',
        raw_scores: [
          {
            measure: 'O11',
            score: 318,
          },
          {
            measure: 'O12',
            score: 9098,
          },
          {
            measure: 'O21',
            score: 352,
          },
          {
            measure: 'O22',
            score: 140032,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 670,
          },
          {
            measure: 'C2',
            score: 149130,
          },
          {
            measure: 'N',
            score: 149800,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 318,
          },
          {
            measure: 'O12',
            score: 9098,
          },
          {
            measure: 'O21',
            score: 352,
          },
          {
            measure: 'O22',
            score: 140032,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 670,
          },
          {
            measure: 'C2',
            score: 149130,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 42.114286,
          },
          {
            measure: 'E12',
            score: 9373.885714,
          },
          {
            measure: 'E21',
            score: 627.885714,
          },
          {
            measure: 'E22',
            score: 139756.114286,
          },
          {
            measure: 'z_score',
            score: 42.512289,
          },
          {
            measure: 't_score',
            score: 15.470903,
          },
          {
            measure: 'log_likelihood',
            score: 887.099522,
          },
          {
            measure: 'simple_ll',
            score: 734.007112,
          },
          {
            measure: 'min_sensitivity',
            score: 0.033772,
          },
          {
            measure: 'liddell',
            score: 0.41362,
          },
          {
            measure: 'dice',
            score: 0.063058,
          },
          {
            measure: 'log_ratio',
            score: 3.751572,
          },
          {
            measure: 'conservative_log_ratio',
            score: 3.345368,
          },
          {
            measure: 'mutual_information',
            score: 0.877998,
          },
          {
            measure: 'local_mutual_information',
            score: 279.203262,
          },
          {
            measure: 'ipm',
            score: 33772.302464,
          },
          {
            measure: 'ipm_reference',
            score: 2507.408252,
          },
          {
            measure: 'ipm_expected',
            score: 4472.630174,
          },
        ],
      },
      {
        item: 'Heiterkeit',
        raw_scores: [
          {
            measure: 'O11',
            score: 27,
          },
          {
            measure: 'O12',
            score: 9389,
          },
          {
            measure: 'O21',
            score: 11,
          },
          {
            measure: 'O22',
            score: 140373,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 38,
          },
          {
            measure: 'C2',
            score: 149762,
          },
          {
            measure: 'N',
            score: 149800,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 27,
          },
          {
            measure: 'O12',
            score: 9389,
          },
          {
            measure: 'O21',
            score: 11,
          },
          {
            measure: 'O22',
            score: 140373,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 38,
          },
          {
            measure: 'C2',
            score: 149762,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 2.388571,
          },
          {
            measure: 'E12',
            score: 9413.611429,
          },
          {
            measure: 'E21',
            score: 35.611429,
          },
          {
            measure: 'E22',
            score: 140348.388571,
          },
          {
            measure: 'z_score',
            score: 15.92457,
          },
          {
            measure: 't_score',
            score: 4.736472,
          },
          {
            measure: 'log_likelihood',
            score: 105.181384,
          },
          {
            measure: 'simple_ll',
            score: 81.734779,
          },
          {
            measure: 'min_sensitivity',
            score: 0.002867,
          },
          {
            measure: 'liddell',
            score: 0.647834,
          },
          {
            measure: 'dice',
            score: 0.005712,
          },
          {
            measure: 'log_ratio',
            score: 5.193498,
          },
          {
            measure: 'conservative_log_ratio',
            score: 3.3688,
          },
          {
            measure: 'mutual_information',
            score: 1.053226,
          },
          {
            measure: 'local_mutual_information',
            score: 28.437089,
          },
          {
            measure: 'ipm',
            score: 2867.459643,
          },
          {
            measure: 'ipm_reference',
            score: 78.356508,
          },
          {
            measure: 'ipm_expected',
            score: 253.671562,
          },
        ],
      },
      {
        item: 'Lache',
        raw_scores: [
          {
            measure: 'O11',
            score: 19,
          },
          {
            measure: 'O12',
            score: 9397,
          },
          {
            measure: 'O21',
            score: 27,
          },
          {
            measure: 'O22',
            score: 140357,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 46,
          },
          {
            measure: 'C2',
            score: 149754,
          },
          {
            measure: 'N',
            score: 149800,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 19,
          },
          {
            measure: 'O12',
            score: 9397,
          },
          {
            measure: 'O21',
            score: 27,
          },
          {
            measure: 'O22',
            score: 140357,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 46,
          },
          {
            measure: 'C2',
            score: 149754,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 2.891429,
          },
          {
            measure: 'E12',
            score: 9413.108571,
          },
          {
            measure: 'E21',
            score: 43.108571,
          },
          {
            measure: 'E22',
            score: 140340.891429,
          },
          {
            measure: 'z_score',
            score: 9.473289,
          },
          {
            measure: 't_score',
            score: 3.69556,
          },
          {
            measure: 'log_likelihood',
            score: 46.305797,
          },
          {
            measure: 'simple_ll',
            score: 39.325012,
          },
          {
            measure: 'min_sensitivity',
            score: 0.002018,
          },
          {
            measure: 'liddell',
            score: 0.350294,
          },
          {
            measure: 'dice',
            score: 0.004016,
          },
          {
            measure: 'log_ratio',
            score: 3.391183,
          },
          {
            measure: 'conservative_log_ratio',
            score: 1.690597,
          },
          {
            measure: 'mutual_information',
            score: 0.817641,
          },
          {
            measure: 'local_mutual_information',
            score: 15.535182,
          },
          {
            measure: 'ipm',
            score: 2017.841971,
          },
          {
            measure: 'ipm_reference',
            score: 192.32961,
          },
          {
            measure: 'ipm_expected',
            score: 307.076101,
          },
        ],
      },
    ],
    unigram_item_scores: [
      {
        item: 'Beifall',
        raw_scores: [
          {
            measure: 'O11',
            score: 318,
          },
          {
            measure: 'O12',
            score: 9098,
          },
          {
            measure: 'O21',
            score: 352,
          },
          {
            measure: 'O22',
            score: 140032,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 670,
          },
          {
            measure: 'C2',
            score: 149130,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 42.114286,
          },
          {
            measure: 'E12',
            score: 9373.885714,
          },
          {
            measure: 'E21',
            score: 627.885714,
          },
          {
            measure: 'E22',
            score: 139756.114286,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 318,
          },
          {
            measure: 'E11',
            score: 42.114286,
          },
          {
            measure: 'z_score',
            score: 42.512289,
          },
          {
            measure: 't_score',
            score: 15.470903,
          },
          {
            measure: 'log_likelihood',
            score: 887.099522,
          },
          {
            measure: 'simple_ll',
            score: 734.007112,
          },
          {
            measure: 'min_sensitivity',
            score: 0.033772,
          },
          {
            measure: 'liddell',
            score: 0.41362,
          },
          {
            measure: 'dice',
            score: 0.063058,
          },
          {
            measure: 'log_ratio',
            score: 3.751572,
          },
          {
            measure: 'conservative_log_ratio',
            score: 3.345368,
          },
          {
            measure: 'mutual_information',
            score: 0.877998,
          },
          {
            measure: 'local_mutual_information',
            score: 279.203262,
          },
          {
            measure: 'ipm',
            score: 33772.302464,
          },
          {
            measure: 'ipm_reference',
            score: 2507.408252,
          },
          {
            measure: 'ipm_expected',
            score: 4472.630174,
          },
        ],
      },
      {
        item: 'Heiterkeit',
        raw_scores: [
          {
            measure: 'O11',
            score: 27,
          },
          {
            measure: 'O12',
            score: 9389,
          },
          {
            measure: 'O21',
            score: 11,
          },
          {
            measure: 'O22',
            score: 140373,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 38,
          },
          {
            measure: 'C2',
            score: 149762,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 2.388571,
          },
          {
            measure: 'E12',
            score: 9413.611429,
          },
          {
            measure: 'E21',
            score: 35.611429,
          },
          {
            measure: 'E22',
            score: 140348.388571,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 27,
          },
          {
            measure: 'E11',
            score: 2.388571,
          },
          {
            measure: 'z_score',
            score: 15.92457,
          },
          {
            measure: 't_score',
            score: 4.736472,
          },
          {
            measure: 'log_likelihood',
            score: 105.181384,
          },
          {
            measure: 'simple_ll',
            score: 81.734779,
          },
          {
            measure: 'min_sensitivity',
            score: 0.002867,
          },
          {
            measure: 'liddell',
            score: 0.647834,
          },
          {
            measure: 'dice',
            score: 0.005712,
          },
          {
            measure: 'log_ratio',
            score: 5.193498,
          },
          {
            measure: 'conservative_log_ratio',
            score: 3.3688,
          },
          {
            measure: 'mutual_information',
            score: 1.053226,
          },
          {
            measure: 'local_mutual_information',
            score: 28.437089,
          },
          {
            measure: 'ipm',
            score: 2867.459643,
          },
          {
            measure: 'ipm_reference',
            score: 78.356508,
          },
          {
            measure: 'ipm_expected',
            score: 253.671562,
          },
        ],
      },
      {
        item: 'Lache',
        raw_scores: [
          {
            measure: 'O11',
            score: 19,
          },
          {
            measure: 'O12',
            score: 9397,
          },
          {
            measure: 'O21',
            score: 27,
          },
          {
            measure: 'O22',
            score: 140357,
          },
          {
            measure: 'R1',
            score: 9416,
          },
          {
            measure: 'R2',
            score: 140384,
          },
          {
            measure: 'C1',
            score: 46,
          },
          {
            measure: 'C2',
            score: 149754,
          },
          {
            measure: 'N',
            score: 149800,
          },
          {
            measure: 'E11',
            score: 2.891429,
          },
          {
            measure: 'E12',
            score: 9413.108571,
          },
          {
            measure: 'E21',
            score: 43.108571,
          },
          {
            measure: 'E22',
            score: 140340.891429,
          },
        ],
        scores: [
          {
            measure: 'O11',
            score: 19,
          },
          {
            measure: 'E11',
            score: 2.891429,
          },
          {
            measure: 'z_score',
            score: 9.473289,
          },
          {
            measure: 't_score',
            score: 3.69556,
          },
          {
            measure: 'log_likelihood',
            score: 46.305797,
          },
          {
            measure: 'simple_ll',
            score: 39.325012,
          },
          {
            measure: 'min_sensitivity',
            score: 0.002018,
          },
          {
            measure: 'liddell',
            score: 0.350294,
          },
          {
            measure: 'dice',
            score: 0.004016,
          },
          {
            measure: 'log_ratio',
            score: 3.391183,
          },
          {
            measure: 'conservative_log_ratio',
            score: 1.690597,
          },
          {
            measure: 'mutual_information',
            score: 0.817641,
          },
          {
            measure: 'local_mutual_information',
            score: 15.535182,
          },
          {
            measure: 'ipm',
            score: 2017.841971,
          },
          {
            measure: 'ipm_reference',
            score: 192.32961,
          },
          {
            measure: 'ipm_expected',
            score: 307.076101,
          },
        ],
      },
    ],
  },
] satisfies ComponentProps<
  typeof DiscoursemeCollocateTable
>['discoursemeScores']
