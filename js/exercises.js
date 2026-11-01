// Exercise library. Format: name | muscle group | equipment | kind [| rep range override]
// Kinds drive how sets are logged and how progression is calculated:
//   CL  main compound, lower body   (heavy, 5–8 reps, +5 kg jumps)
//   CU  main compound, upper body   (heavy, 5–8 reps, +2.5 kg jumps)
//   S   secondary compound          (8–12 reps)
//   I   isolation                   (10–15 reps, smallest jumps)
//   B   bodyweight reps             (10–20 reps, then add load)
//   BH  hard bodyweight             (5–10 reps, then add load)
//   A   assisted machine            (6–12 reps, progress = less assistance)
//   T   timed hold / carry          (seconds, optional kg)
//   K   cardio                      (minutes + optional metric after ':', e.g. K:km, K:floors)
const RAW = `
Barbell Bench Press|Chest|Barbell|CU
Paused Bench Press|Chest|Barbell|CU
Incline Barbell Bench Press|Chest|Barbell|S|6-10
Decline Barbell Bench Press|Chest|Barbell|S|6-10
Floor Press|Chest|Barbell|S|6-10
Dumbbell Bench Press|Chest|Dumbbell|S
Incline Dumbbell Press|Chest|Dumbbell|S
Decline Dumbbell Press|Chest|Dumbbell|S
Dumbbell Fly|Chest|Dumbbell|I
Incline Dumbbell Fly|Chest|Dumbbell|I
Dumbbell Pullover|Chest|Dumbbell|I
Smith Machine Bench Press|Chest|Smith|S
Smith Machine Incline Press|Chest|Smith|S
Machine Chest Press|Chest|Machine|S
Incline Machine Press|Chest|Machine|S
Hammer Strength Chest Press|Chest|Machine|S
Pec Deck|Chest|Machine|I
Cable Crossover|Chest|Cable|I
Low-to-High Cable Fly|Chest|Cable|I
High-to-Low Cable Fly|Chest|Cable|I
Single-Arm Cable Press|Chest|Cable|I
Svend Press|Chest|Other|I
Push-Up|Chest|Bodyweight|B
Incline Push-Up|Chest|Bodyweight|B
Decline Push-Up|Chest|Bodyweight|B
Deficit Push-Up|Chest|Bodyweight|B
Chest Dip|Chest|Bodyweight|BH
Deadlift|Back|Barbell|CL
Sumo Deadlift|Back|Barbell|CL
Trap Bar Deadlift|Back|Trap bar|CL
Deficit Deadlift|Back|Barbell|CL
Rack Pull|Back|Barbell|CL
Barbell Row|Back|Barbell|CU|6-10
Pendlay Row|Back|Barbell|CU
Yates Row|Back|Barbell|S
T-Bar Row|Back|Barbell|S
Chest-Supported T-Bar Row|Back|Machine|S
Seal Row|Back|Barbell|S
Meadows Row|Back|Barbell|S
Dumbbell Row|Back|Dumbbell|S
Chest-Supported Dumbbell Row|Back|Dumbbell|S
Kroc Row|Back|Dumbbell|S|12-20
Seated Cable Row|Back|Cable|S
Wide-Grip Cable Row|Back|Cable|S
Single-Arm Cable Row|Back|Cable|I
Machine Row|Back|Machine|S
Hammer Strength Row|Back|Machine|S
Lat Pulldown|Back|Cable|S
Close-Grip Lat Pulldown|Back|Cable|S
Reverse-Grip Lat Pulldown|Back|Cable|S
Single-Arm Lat Pulldown|Back|Cable|I
Machine Pulldown|Back|Machine|S
Straight-Arm Pulldown|Back|Cable|I
Pull-Up|Back|Bodyweight|BH
Chin-Up|Back|Bodyweight|BH
Neutral-Grip Pull-Up|Back|Bodyweight|BH
Muscle-Up|Back|Bodyweight|BH|3-8
Assisted Pull-Up|Back|Machine|A
Assisted Chin-Up|Back|Machine|A
Inverted Row|Back|Bodyweight|B
Back Extension|Back|Bodyweight|B
Superman Hold|Back|Bodyweight|T
Barbell Shrug|Traps|Barbell|I
Dumbbell Shrug|Traps|Dumbbell|I
Smith Machine Shrug|Traps|Smith|I
Trap Bar Shrug|Traps|Trap bar|I
Overhead Press|Shoulders|Barbell|CU
Push Press|Shoulders|Barbell|S|5-8
Seated Barbell Press|Shoulders|Barbell|S|6-10
Seated Dumbbell Press|Shoulders|Dumbbell|S
Standing Dumbbell Press|Shoulders|Dumbbell|S
Arnold Press|Shoulders|Dumbbell|S
Machine Shoulder Press|Shoulders|Machine|S
Smith Machine Shoulder Press|Shoulders|Smith|S
Landmine Press|Shoulders|Barbell|S
Dumbbell Lateral Raise|Shoulders|Dumbbell|I|12-20
Cable Lateral Raise|Shoulders|Cable|I|12-20
Machine Lateral Raise|Shoulders|Machine|I|12-20
Lean-Away Lateral Raise|Shoulders|Dumbbell|I|12-20
Dumbbell Front Raise|Shoulders|Dumbbell|I
Plate Front Raise|Shoulders|Other|I
Cable Front Raise|Shoulders|Cable|I
Rear Delt Fly|Shoulders|Dumbbell|I|12-20
Reverse Pec Deck|Shoulders|Machine|I|12-20
Cable Rear Delt Fly|Shoulders|Cable|I|12-20
Face Pull|Shoulders|Cable|I|12-20
Upright Row|Shoulders|Barbell|I
Cable Upright Row|Shoulders|Cable|I
Y-Raise|Shoulders|Dumbbell|I|12-20
Band Pull-Apart|Shoulders|Band|B
Pike Push-Up|Shoulders|Bodyweight|B|8-15
Handstand Push-Up|Shoulders|Bodyweight|BH|3-8
Barbell Curl|Biceps|Barbell|I|8-12
EZ-Bar Curl|Biceps|EZ bar|I|8-12
Dumbbell Curl|Biceps|Dumbbell|I
Alternating Dumbbell Curl|Biceps|Dumbbell|I
Hammer Curl|Biceps|Dumbbell|I
Incline Dumbbell Curl|Biceps|Dumbbell|I
Preacher Curl|Biceps|EZ bar|I
Machine Preacher Curl|Biceps|Machine|I
Concentration Curl|Biceps|Dumbbell|I
Spider Curl|Biceps|Dumbbell|I
Cable Curl|Biceps|Cable|I
Bayesian Cable Curl|Biceps|Cable|I
Rope Hammer Curl|Biceps|Cable|I
Drag Curl|Biceps|Barbell|I
Zottman Curl|Biceps|Dumbbell|I
Close-Grip Bench Press|Triceps|Barbell|S|6-10
JM Press|Triceps|Barbell|S
Triceps Pushdown (Bar)|Triceps|Cable|I
Rope Pushdown|Triceps|Cable|I
Reverse-Grip Pushdown|Triceps|Cable|I
Overhead Cable Extension|Triceps|Cable|I
Single-Arm Cable Extension|Triceps|Cable|I
Skull Crusher|Triceps|EZ bar|I|8-12
Dumbbell Skull Crusher|Triceps|Dumbbell|I
Overhead Dumbbell Extension|Triceps|Dumbbell|I
Dumbbell Kickback|Triceps|Dumbbell|I
Machine Triceps Extension|Triceps|Machine|I
Dip Machine|Triceps|Machine|S
Assisted Dip|Triceps|Machine|A
Triceps Dip|Triceps|Bodyweight|BH
Bench Dip|Triceps|Bodyweight|B
Diamond Push-Up|Triceps|Bodyweight|B
Reverse Curl|Forearms|EZ bar|I
Wrist Curl|Forearms|Barbell|I|12-20
Reverse Wrist Curl|Forearms|Barbell|I|12-20
Dumbbell Wrist Curl|Forearms|Dumbbell|I|12-20
Wrist Roller|Forearms|Other|I|3-6
Farmer's Carry|Forearms|Dumbbell|T
Dead Hang|Forearms|Bodyweight|T
Plate Pinch|Forearms|Other|T
Back Squat|Quads|Barbell|CL
Front Squat|Quads|Barbell|CL
Safety Bar Squat|Quads|Barbell|CL
Pause Squat|Quads|Barbell|S|4-6
Box Squat|Quads|Barbell|S|5-8
Zercher Squat|Quads|Barbell|S|6-10
Smith Machine Squat|Quads|Smith|S
Hack Squat|Quads|Machine|S
Pendulum Squat|Quads|Machine|S
Belt Squat|Quads|Machine|S
Leg Press|Quads|Machine|S|10-15
Single-Leg Leg Press|Quads|Machine|S
Goblet Squat|Quads|Dumbbell|S
Bulgarian Split Squat|Quads|Dumbbell|S
Walking Lunge|Quads|Dumbbell|S|10-16
Reverse Lunge|Quads|Dumbbell|S
Forward Lunge|Quads|Dumbbell|S
Smith Machine Lunge|Quads|Smith|S
Step-Up|Quads|Dumbbell|S
Leg Extension|Quads|Machine|I
Single-Leg Extension|Quads|Machine|I
Sissy Squat|Quads|Bodyweight|B|8-15
Bodyweight Squat|Quads|Bodyweight|B|15-30
Jump Squat|Quads|Bodyweight|B
Box Jump|Quads|Bodyweight|B|5-10
Pistol Squat|Quads|Bodyweight|BH|3-8
Wall Sit|Quads|Bodyweight|T
Romanian Deadlift|Hamstrings|Barbell|S|6-10
Dumbbell Romanian Deadlift|Hamstrings|Dumbbell|S
Stiff-Leg Deadlift|Hamstrings|Barbell|S
Single-Leg Romanian Deadlift|Hamstrings|Dumbbell|S
Good Morning|Hamstrings|Barbell|S
Lying Leg Curl|Hamstrings|Machine|I
Seated Leg Curl|Hamstrings|Machine|I
Standing Leg Curl|Hamstrings|Machine|I
Nordic Curl|Hamstrings|Bodyweight|BH|3-8
Glute-Ham Raise|Hamstrings|Bodyweight|BH
Swiss Ball Leg Curl|Hamstrings|Other|B
Barbell Hip Thrust|Glutes|Barbell|CL|6-10
Smith Machine Hip Thrust|Glutes|Smith|S
Machine Hip Thrust|Glutes|Machine|S
Glute Bridge|Glutes|Barbell|S
Single-Leg Hip Thrust|Glutes|Bodyweight|B
Cable Pull-Through|Glutes|Cable|S|10-15
Kettlebell Swing|Glutes|Kettlebell|S|12-20
Cable Kickback|Glutes|Cable|I
Glute Kickback Machine|Glutes|Machine|I
Hip Abduction Machine|Glutes|Machine|I|12-20
Cable Hip Abduction|Glutes|Cable|I|12-20
Frog Pump|Glutes|Bodyweight|B|15-30
Banded Lateral Walk|Glutes|Band|B
Hip Adduction Machine|Adductors|Machine|I|12-20
Copenhagen Plank|Adductors|Bodyweight|T
Standing Calf Raise|Calves|Machine|I|10-20
Seated Calf Raise|Calves|Machine|I|12-20
Leg Press Calf Raise|Calves|Machine|I|12-20
Smith Machine Calf Raise|Calves|Smith|I|10-20
Donkey Calf Raise|Calves|Machine|I|12-20
Single-Leg Dumbbell Calf Raise|Calves|Dumbbell|I|10-20
Bodyweight Calf Raise|Calves|Bodyweight|B|15-30
Tibialis Raise|Calves|Bodyweight|B|15-30
Plank|Core|Bodyweight|T
Side Plank|Core|Bodyweight|T
Hollow Body Hold|Core|Bodyweight|T
L-Sit|Core|Bodyweight|T
Suitcase Carry|Core|Dumbbell|T
Crunch|Core|Bodyweight|B|15-30
Cable Crunch|Core|Cable|I|12-20
Machine Crunch|Core|Machine|I|12-20
Decline Sit-Up|Core|Bodyweight|B
Hanging Leg Raise|Core|Bodyweight|B|8-15
Hanging Knee Raise|Core|Bodyweight|B
Captain's Chair Leg Raise|Core|Bodyweight|B
Lying Leg Raise|Core|Bodyweight|B
Ab Wheel Rollout|Core|Other|B|6-15
Russian Twist|Core|Other|B|15-30
Bicycle Crunch|Core|Bodyweight|B|15-30
Dead Bug|Core|Bodyweight|B
Bird Dog|Core|Bodyweight|B
V-Up|Core|Bodyweight|B
Toes-to-Bar|Core|Bodyweight|BH
Dragon Flag|Core|Bodyweight|BH|3-8
Pallof Press|Core|Cable|I
Woodchopper|Core|Cable|I
Mountain Climber|Core|Bodyweight|T
Power Clean|Full body|Barbell|CL|3-5
Hang Clean|Full body|Barbell|S|3-6
Clean and Jerk|Full body|Barbell|S|1-3
Snatch|Full body|Barbell|S|1-3
Thruster|Full body|Barbell|S|6-10
Dumbbell Thruster|Full body|Dumbbell|S
Turkish Get-Up|Full body|Kettlebell|S|3-6
Kettlebell Clean and Press|Full body|Kettlebell|S|5-10
Burpee|Full body|Bodyweight|B|10-25
Medicine Ball Slam|Full body|Other|B
Wall Ball|Full body|Other|B|12-25
Sled Push|Full body|Other|T
Sled Pull|Full body|Other|T
Battle Ropes|Full body|Other|T
Treadmill Walk|Cardio|Cardio machine|K:km
Incline Treadmill Walk|Cardio|Cardio machine|K:incline
Treadmill Run|Cardio|Cardio machine|K:km
Outdoor Walk|Cardio|Other|K:km
Outdoor Run|Cardio|Other|K:km
Hiking|Cardio|Other|K:km
StairMaster|Cardio|Cardio machine|K:floors
Stair Climbing|Cardio|Other|K:floors
Elliptical|Cardio|Cardio machine|K:level
Stationary Bike|Cardio|Cardio machine|K:km
Spin Bike|Cardio|Cardio machine|K:level
Outdoor Cycling|Cardio|Other|K:km
Rowing Machine|Cardio|Cardio machine|K:km
Ski Erg|Cardio|Cardio machine|K:km
Air Bike|Cardio|Cardio machine|K:kcal
Swimming|Cardio|Other|K:km
Jump Rope|Cardio|Other|K
HIIT Intervals|Cardio|Other|K:rounds
Boxing / Bag Work|Cardio|Other|K:rounds
Football|Cardio|Other|K
Basketball|Cardio|Other|K
`;

export const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const LIBRARY = RAW.trim().split('\n').map(line => {
  const [name, group, equip, kindRaw, range] = line.split('|');
  const [kind, metric] = kindRaw.split(':');
  const ex = { id: slug(name), name, group, equip, kind };
  if (metric) ex.metric = metric;
  if (range) { const [lo, hi] = range.split('-').map(Number); ex.lo = lo; ex.hi = hi; }
  return ex;
});

export const GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Traps', 'Quads', 'Hamstrings', 'Glutes', 'Adductors', 'Calves', 'Core', 'Full body', 'Cardio', 'Other'];
export const EQUIPMENT = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Smith', 'EZ bar', 'Trap bar', 'Kettlebell', 'Bodyweight', 'Band', 'Cardio machine', 'Other'];
export const KINDS = {
  CL: 'Main lift, lower body', CU: 'Main lift, upper body', S: 'Compound / machine', I: 'Isolation',
  B: 'Bodyweight reps', BH: 'Hard bodyweight', A: 'Assisted machine', T: 'Timed hold / carry', K: 'Cardio',
};
export const METRICS = { km: 'km', floors: 'floors', level: 'level', incline: 'incline %', kcal: 'kcal', rounds: 'rounds' };

const byId = new Map(LIBRARY.map(e => [e.id, e]));

export function getExercise(id, custom = []) {
  return byId.get(id) || custom.find(e => e.id === id) || null;
}

export function allExercises(custom = []) {
  return [...LIBRARY, ...custom];
}

export function findExerciseByName(name, custom = []) {
  const id = slug(name || '');
  return getExercise(id, custom) || allExercises(custom).find(e => slug(e.name).includes(id) && id.length > 3) || null;
}
