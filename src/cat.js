// Everything about the cat lives here. Edit this file to make the site yours.
// Photos: drop images into public/photos and list them below as 'photos/your-file.jpg' (jpg, png, webp, svg all work).

export const cat = {
  name: 'Mochi',
  tagline: 'Professional napper. Part-time mouse enthusiast. Full-time cutie.',
  bio:
    'Mochi is an orange tabby with strong opinions about breakfast timing and an unshakeable belief that every box is a gift. Mochi enjoys sunbeams, stalking feet under blankets, and supervising all keyboard activity.',

  details: [
    { label: 'Breed', value: 'Orange tabby' },
    { label: 'Age', value: '4 years' },
    { label: 'Favorite toy', value: 'Crinkle mouse' },
    { label: 'Favorite spot', value: 'Wherever you were just sitting' },
    { label: 'Weakness', value: 'The sound of a can opener' },
  ],

  // 0 to 100
  traits: [
    { label: 'Napping', value: 96 },
    { label: '3 a.m. zoomies', value: 82 },
    { label: 'Curiosity', value: 90 },
    { label: 'Cuddliness', value: 68 },
    { label: 'Patience at the vet', value: 9 },
  ],

  facts: [
    { icon: '📦', title: 'Box inspector', fact: 'Has never met a cardboard box it did not immediately climb into. Size is irrelevant.' },
    { icon: '☕', title: 'Gravity tester', fact: 'Has scientifically confirmed 23 times that cups do, in fact, fall off tables.' },
    { icon: '⏰', title: 'Living alarm clock', fact: 'Starts announcing breakfast at 5:42 a.m. Every day. Even on weekends.' },
    { icon: '🐦', title: 'Bird watcher', fact: 'Spends an hour each morning chattering at the birds outside the kitchen window.' },
    { icon: '💤', title: 'Nap champion', fact: 'Personal record: 16 hours of sleep in a single day, across 9 different spots.' },
    { icon: '🧦', title: 'Sock thief', fact: 'Has a secret stash of stolen socks under the couch. Nobody knows why.' },
    { icon: '🚽', title: 'Toilet scholar', fact: 'Is learning to use the human toilet with potty training rings. Litter boxes are so last year.' },
  ],

  // Toilet training with potty training rings: each stage removes a ring so the hole gets bigger.
  // Bump `currentStage` (0-based) as the cat progresses.
  pottyTraining: {
    currentStage: 1,
    // Each stage: a fun one-liner, then a practical how-to for other cat owners.
    stages: [
      {
        title: 'Litter on the throne',
        detail: 'The trainer sits on the toilet seat, all rings in, filled with litter. Same old litter box, new fancy location.',
        time: '1–2 weeks',
        steps: [
          'Over a few days, move the old litter box into the bathroom, then right next to the toilet.',
          'Raise the box a little each day (sturdy books or a step work well) until it sits level with the toilet seat.',
          'Fit the training seat on the toilet with every ring in place and fill it with flushable litter. Clay litter can clog pipes.',
          'Remove the old litter box so the toilet is the only option.',
          'Keep the lid up, the seat down and the bathroom door open at all times.',
        ],
        readyWhen: 'Your cat uses the trainer every time, with no accidents, for at least a week.',
      },
      {
        title: 'First ring out',
        detail: 'A small hole opens in the middle. Learning to aim. Mostly succeeding.',
        time: '1–2 weeks',
        steps: [
          'Take out the smallest, center ring to open a small hole over the water.',
          'Use a little less litter, keeping it on the remaining rings so it still smells like a litter box.',
          'Your cat will start to squat over the hole, and some waste will drop into the water. Flush after each use.',
          'Reward calm visits with praise or a treat afterwards. Never scold an accident.',
        ],
        readyWhen: 'Your cat goes over the hole confidently and isn’t bothered by the water below.',
      },
      {
        title: 'Bigger hole',
        detail: 'Less litter, more water. Balancing on the seat like a tiny gymnast.',
        time: '1–3 weeks',
        steps: [
          'Remove the next ring to make the hole bigger.',
          'Cut the litter down to a light sprinkle on what’s left of the tray.',
          'Your cat will start resting its paws on the toilet seat itself. This is the big balance lesson.',
          'If your cat hesitates or has an accident, put the ring back for a few days. Going back a stage is normal.',
        ],
        readyWhen: 'Your cat perches on the seat with its paws, not on the tray, and aims into the water.',
      },
      {
        title: 'Last ring',
        detail: 'Just a thin ring left. Litter? Barely know her.',
        time: '1–2 weeks',
        steps: [
          'Remove the final inner ring so only the outer rim of the trainer is left.',
          'Use little to no litter. Just a pinch helps if your cat still looks for the familiar smell.',
          'Your cat should now squat with all four paws on the seat, the same way it will without the trainer.',
          'Keep an eye out for accidents elsewhere in the house, a sign of moving too fast.',
        ],
        readyWhen: 'A week or more of clean, confident visits with almost no litter.',
      },
      {
        title: 'Fully toilet trained',
        detail: 'No rings, no litter, no scooping. Just needs to learn to flush.',
        time: 'Forever (with reminders)',
        steps: [
          'Take the trainer off completely. It’s just your cat and the toilet now.',
          'Keep the seat down, the lid up and the door open. One closed door can undo weeks of work.',
          'Flush after each visit so the toilet stays clean and inviting.',
          'Keep the trainer handy. If your cat gets sick, stressed or confused, a short refresher can help.',
        ],
        readyWhen: 'You did it! Celebrate with your cat’s favorite treat.',
      },
    ],

    beforeYouStart: [
      'Ask your vet first. Toilet training suits healthy adult cats best, not young kittens or cats with joint problems.',
      'Expect it to take anywhere from a few weeks to a few months. Every cat goes at its own pace.',
      'Make sure everyone at home knows the rules: seat down, lid up, door open.',
      'Most kits come with 3–4 rings. If yours has more, take them out one at a time at the same pace.',
    ],

    goodToKnow: [
      'You can no longer see changes in pee or poop, which are often an early sign of illness. Keep an eye on your cat’s habits.',
      'Some places advise against flushing cat poop. It can carry a parasite (Toxoplasma) that harms wildlife in waterways. Check your local guidance.',
      'If you have a septic system or older plumbing, check that flushable litter is safe for it.',
      'Some cats simply prefer a litter box, and that’s okay. Never force it.',
    ],
  },

  photos: [
    { src: 'photos/sunbeam.svg', caption: 'Official sunbeam inspector' },
    { src: 'photos/box.svg', caption: 'If it fits, I sits' },
    { src: 'photos/nap.svg', caption: 'Nap number four of the day' },
    { src: 'photos/yarn.svg', caption: "Yarn's natural predator" },
    { src: 'photos/window.svg', caption: 'Watching Bird TV' },
    { src: 'photos/blanket.svg', caption: 'Loaf mode: activated' },
  ],
};
