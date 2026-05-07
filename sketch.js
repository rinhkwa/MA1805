let sprites = {};
let sfx = {};
let backgrounds = {};

// Sound files used in the game.
let soundList = [
  { key: "background", path: "sounds/background.mp3" },
  { key: "bear", path: "sounds/bear.mp3" },
  { key: "forest", path: "sounds/forest.mp3" },
  { key: "shot", path: "sounds/shot.mp3" },
  { key: "station", path: "sounds/station.mp3" },
  { key: "swamp", path: "sounds/swamp.mp3" }
];

// Character sprites and special images.
let spriteList = [
  { key: "bearAggressive", path: "assets/bear_agressive.png" },
  { key: "bearAngry", path: "assets/bear_angry.png" },
  { key: "bearNeutral", path: "assets/bear.png" },

  { key: "deerCrying", path: "assets/deer_crying.png" },
  { key: "deerNeutral", path: "assets/deer.png" },

  { key: "girlAngry", path: "assets/girl_angry.png" },
  { key: "girlNeutral", path: "assets/girl_neutral.png" },
  { key: "girlScared", path: "assets/girl_scared.png" },

  { key: "heronAngry", path: "assets/heron_angry.png" },
  { key: "heronNeutral", path: "assets/heron.png" },

  { key: "amberNeutral", path: "assets/toxickid.png" },

  { key: "shotDeath", path: "assets/shot.png" }
];

// Background images for different locations.
let bgList = [
  { key: "exited", path: "backgrounds/exited.jpeg" },
  { key: "family", path: "backgrounds/family.jpg" },
  { key: "forest", path: "backgrounds/forest.png" },
  { key: "swamp", path: "backgrounds/swamp.png" },
  { key: "young", path: "backgrounds/young.png" },
  { key: "lab", path: "backgrounds/lab.jpg" },
  { key: "zoo", path: "backgrounds/zoo.jpg" }
];

// Loading progress variables.
let loadedCount = 0;
let totalCount = spriteList.length + soundList.length + bgList.length;
let ready = false;
let loadFailed = false;
let loadFailMsg = "";

// Canvas size.
const W = 1000;
const H = 720;

// Current story state.
let currentSceneId = "intro";
let lineIndex = 0;
let currentLines = [];
let choices = [];
let showingChoices = false;

// Player data.
let gameStarted = false;
let playerName = "";

// Start screen HTML elements.
let nameInput;
let startButton;

// Companion state.
let hasPeanutCompanion = false;

// Audio state variables.
let audioStarted = false;
let currentAmbientSound = null;
let bearSoundActive = false;
let lastShotLineId = "";

// Creates a dialogue line.
function line(speaker, text) {
  return { speaker, text };
}

// Creates a choice button.
function choice(text, next) {
  return { text, next };
}

// Returns text from a dialogue or choice object.
function getText(obj) {
  if (!obj) return "";
  return obj.text || "";
}

// Returns the player name or the default name.
function getPlayerName() {
  if (playerName.trim().length > 0) return playerName.trim();
  return "Hero";
}

// Converts speaker keys into names shown on screen.
function getSpeakerName(key) {
  const names = {
    protagonist: getPlayerName(),
    text: "Text",
    system: "System",
    ending: "Ending",
    deer: "Peanut",
    bear: "North",
    bearUnknown: "Bear",
    heron: "Grey",
    amber: "Amber"
  };

  if (!names[key]) return key;
  return names[key];
}

// Returns the speaker of the current dialogue line.
function getActiveSpeaker() {
  if (!currentLines || currentLines.length === 0) return null;
  return currentLines[lineIndex].speaker;
}

// Changes character opacity depending on who is speaking.
function getCharacterAlpha(actor) {
  const active = getActiveSpeaker();

  if (active === "text" || active === "system" || active === "ending") {
    return 210;
  }

  if (active === actor) {
    return 255;
  }

  return 105;
}

// Loads all images, sounds, and backgrounds before the game starts.
function preload() {
  for (let asset of spriteList) {
    sprites[asset.key] = loadImage(
      asset.path,
      () => onAssetLoaded(),
      () => onAssetFailed(`Could not load file: ${asset.path}`)
    );
  }

  for (let asset of bgList) {
    backgrounds[asset.key] = loadImage(
      asset.path,
      () => onAssetLoaded(),
      () => onAssetFailed(`Could not load background: ${asset.path}`)
    );
  }

  for (let asset of soundList) {
    sfx[asset.key] = loadSound(
      asset.path,
      () => onAssetLoaded(),
      () => onAssetFailed(`Could not load sound: ${asset.path}`)
    );
  }
}

// Updates the loading counter.
function onAssetLoaded() {
  loadedCount++;
  if (loadedCount >= totalCount) {
    ready = true;
  }
}

// Shows an error if an asset cannot be loaded.
function onAssetFailed(msg) {
  loadFailed = true;
  loadFailMsg = msg;
  console.error(msg);
}

// Creates the canvas and start screen elements.
function setup() {
  createCanvas(W, H);
  textFont("Arial");

  nameInput = createInput("");
  nameInput.attribute("placeholder", "Enter name");
  nameInput.hide();

  startButton = createButton("Start");
  startButton.hide();
  startButton.mousePressed(startGame);
}

// Main drawing loop.
function draw() {
  if (!ready || loadFailed) {
    drawLoadingScreen();
    return;
  }

  if (!gameStarted) {
    drawStartScreen();
    return;
  }

  hideMenuDOM();

  const scene = scenes[currentSceneId];

  if (scene && scene.isFinal) {
    drawEndingPage();
    return;
  }

  drawSceneBackground();

  const isOpeningIntro =
    scene &&
    scene.background === "intro" &&
    currentSceneId === "intro";

  if (scene && scene.fullscreenImageKey) {
    drawFullscreenSprite(scene.fullscreenImageKey);
  } else if (shouldShowFamilyPhoto()) {
    drawFullscreenBackground("family");
  } else if (!isOpeningIntro) {
    drawCharacterLeft();
    drawRightSide();
  }

  drawDialogueBox();

  if (showingChoices) {
    drawChoices();
  }
}

// Handles mouse clicks during the game.
function mousePressed() {
  if (!gameStarted) return;

  if (showingChoices) {
    handleChoiceClick(mouseX, mouseY);
  } else {
    advanceDialogue();
  }
}

// Handles keyboard controls.
function keyPressed() {
  if (!gameStarted) {
    if (keyCode === ENTER && ready && !loadFailed) {
      startGame();
    }
    return;
  }

  if (showingChoices) {
    if (key >= "1" && key <= "9") {
      const index = int(key) - 1;
      if (choices[index]) {
        selectChoice(index);
      }
    }
    return;
  }

  if (key === " " || keyCode === ENTER) {
    advanceDialogue();
  }
}

// Starts the game after the player enters a name.
function startGame() {
  playerName = nameInput.value().trim();

  if (playerName.length === 0) {
    playerName = "Hero";
  }

  hasPeanutCompanion = false;
  gameStarted = true;

  initAudio();

  setScene("intro");
  hideMenuDOM();
}

// Hides the name input and start button.
function hideMenuDOM() {
  if (nameInput) nameInput.hide();
  if (startButton) startButton.hide();
}

// Starts the audio after user interaction.
function initAudio() {
  if (audioStarted) return;

  userStartAudio();
  audioStarted = true;

  if (sfx.background && !sfx.background.isPlaying()) {
    sfx.background.setVolume(0.22);
    sfx.background.loop();
  }

  updateAmbientSound();
}

// Stops a sound if it is currently playing.
function stopIfPlaying(key) {
  if (sfx[key] && sfx[key].isPlaying()) {
    sfx[key].stop();
  }
}

// Starts a looping sound only when needed.
function loopIfNeeded(key, volume) {
  if (!sfx[key]) return;
  sfx[key].setVolume(volume);
  if (!sfx[key].isPlaying()) {
    sfx[key].loop();
  }
}

// Selects the ambient sound for the current scene.
function getAmbientForScene(scene) {
  if (!scene) return null;

  if (scene.background === "burnedForest") return "forest";
  if (scene.background === "dryPond") return "swamp";

  if (
    scene.background === "toxicStation" ||
    scene.background === "capsuleRoom" ||
    scene.actor === "amber"
  ) {
    return "station";
  }

  return null;
}

// Checks if North is visible in the current scene.
function sceneHasBear(scene) {
  if (!scene) return false;
  if (scene.actor === "bear") return true;
  if (scene.characterKey && scene.characterKey.includes("bear")) return true;
  return false;
}

// Updates ambient sounds when the scene changes.
function updateAmbientSound() {
  if (!audioStarted) return;

  const scene = scenes[currentSceneId];

  if (!scene) {
    console.error("Scene not found for sound update:", currentSceneId);
    return;
  }

  const newAmbient = getAmbientForScene(scene);

  if (newAmbient !== currentAmbientSound) {
    if (currentAmbientSound) {
      stopIfPlaying(currentAmbientSound);
    }

    currentAmbientSound = newAmbient;

    if (currentAmbientSound) {
      loopIfNeeded(currentAmbientSound, 0.28);
    }
  }

  const bearNearby = sceneHasBear(scene);

  if (bearNearby && !bearSoundActive) {
    bearSoundActive = true;
    loopIfNeeded("bear", 0.25);
  }

  if (!bearNearby && bearSoundActive) {
    bearSoundActive = false;
    stopIfPlaying("bear");
  }
}

// Plays the gunshot sound once for the correct dialogue line.
function playShotIfNeeded() {
  if (!audioStarted) return;
  if (!currentLines || currentLines.length === 0) return;

  const current = currentLines[lineIndex];
  if (!current) return;

  const text = (current.text || "").toLowerCase();
  const hasShot =
    text.includes("shot") ||
    text.includes("a second shot") ||
    text.includes("a shot rings out");

  if (!hasShot) return;

  const lineId = `${currentSceneId}_${lineIndex}`;
  if (lastShotLineId === lineId) return;

  lastShotLineId = lineId;

  if (sfx.shot) {
    sfx.shot.setVolume(0.75);
    sfx.shot.play();
  }
}

// Stores all scenes, dialogue, choices, and story paths.
const scenes = {
  intro: {
    characterKey: null,
    actor: null,
    background: "intro",
    protagonistMood: "neutral",
    lines: [
      line("text", "The city no longer looks like a city. It stands motionless, as if someone paused the world and forgot to come back."),
      line("text", "There are no cars in the streets, no voices, no birds. Only a dry wind pushes dust, ash, and torn old notices across the asphalt."),
      line("text", "You step out of the old bunker. Beyond the door there is no salvation, only a strange, dried-out world that kept dying without you."),
      line("text", "Somewhere ahead, the burned forest begins. Black trunks stick out of the ground like charred bones."),
      line("text", "A deer with a rifle appears between the trees. He notices you before you have time to step back.")
    ],
    next: "deer_start"
  },

  deer_start: {
    characterKey: "deerNeutral",
    actor: "deer",
    background: "burnedForest",
    protagonistMood: "scared",
    lines: [
      line("deer", "Stop. One more step and I decide you are dangerous."),
      line("protagonist", "I am not dangerous. I am just lost."),
      line("deer", "Lost? In a burned forest? Teenagers do not come here by accident."),
      line("protagonist", "I came out of a bunker. I do not know where the roads are anymore."),
      line("deer", "From a bunker?"),
      line("protagonist", "Yes. I was there almost the whole time. First with people. Then… almost alone."),
      line("deer", "So you did not see all of this dying."),
      line("protagonist", "No."),
      line("deer", "Lucky you."),
      line("protagonist", "I am not sure. Sometimes it feels worse to come out and realize the world died without you."),
      line("deer", "The world did not die. It simply became cruel, hungry, and very quiet."),
      line("protagonist", "Do you live here?"),
      line("deer", "I did. When there was still a forest here."),
      line("protagonist", "And the rifle?"),
      line("deer", "Do not ask that question until you learn not to shake when you see a weapon.")
    ],
    choices: [
      choice("You do not trust me?", "deer_trust"),
      choice("I understand what it is like to lose a home", "deer_home"),
      choice("Do you think I am weak?", "deer_weak")
    ]
  },

  deer_trust: {
    characterKey: "deerNeutral",
    actor: "deer",
    background: "burnedForest",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "You do not trust me?"),
      line("deer", "No."),
      line("protagonist", "Why?"),
      line("deer", "Because you are too clean for this place."),
      line("protagonist", "Is that bad?"),
      line("deer", "It is suspicious."),
      line("protagonist", "I was just in a bunker."),
      line("deer", "Exactly. You do not smell like smoke. You do not know where the ground caves in. You do not flinch at the wrong kind of silence."),
      line("protagonist", "I do flinch."),
      line("deer", "But not at the things you should."),
      line("protagonist", "You talk as if I am guilty for surviving."),
      line("deer", "No. But sometimes it is hard to look at someone the disaster did not manage to touch with its hands."),
      line("protagonist", "It touched me. Just differently."),
      line("deer", "How?"),
      line("protagonist", "It took my whole world from me. My parents, my friends."),
      line("deer", "…"),
      line("protagonist", "I did not see the fire. But I saw people stop hoping."),
      line("deer", "Then maybe you are not as clean as you look."),
      line("protagonist", "Maybe not.")
    ],
    next: "deer_test"
  },

  deer_home: {
    characterKey: "deerNeutral",
    actor: "deer",
    background: "burnedForest",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "I understand what it is like to lose a home."),
      line("deer", "Do you?"),
      line("protagonist", "My home did not burn. It just stayed somewhere above while I lived underground. At first I thought we would all return in a week… together. Then first my mother, then my father… I do not want to talk about it."),
      line("deer", "You were in the bunker all that time?"),
      line("protagonist", "Yes."),
      line("deer", "With whom?"),
      line("protagonist", "First with my family. Then with other people. Then there were fewer and fewer people."),
      line("deer", "Did they die?"),
      line("protagonist", "Some did. Some went outside and never came back. Some simply stopped speaking one day."),
      line("deer", "There is silence in bunkers too?"),
      line("protagonist", "Yes. But it is different. In the forest, silence is wide. In a bunker, it presses in from every side."),
      line("deer", "Do you miss it?"),
      line("protagonist", "The bunker? No. But at least there you knew where the walls were."),
      line("deer", "Outside, there are no walls anymore."),
      line("protagonist", "I noticed."),
      line("deer", "And you still keep going?"),
      line("protagonist", "Yes. Because if I survived only to sit underground, that is too cruel a joke.")
    ],
    next: "deer_test"
  },

  deer_weak: {
    characterKey: "deerNeutral",
    actor: "deer",
    background: "burnedForest",
    protagonistMood: "angry",
    lines: [
      line("protagonist", "Do you think I am weak?"),
      line("deer", "Yes."),
      line("protagonist", "You are cruel."),
      line("deer", "You asked."),
      line("protagonist", "Because I am from a bunker?"),
      line("deer", "Because you look at the world as if it owes you an explanation."),
      line("protagonist", "Does it not?"),
      line("deer", "No. After a disaster, the world explains nothing. It only tests how much you can endure."),
      line("protagonist", "I endured the bunker."),
      line("deer", "The bunker protected you."),
      line("protagonist", "And locked me in."),
      line("deer", "…"),
      line("protagonist", "Do you think that because I have no burns and no weapon, I have not lived through anything?"),
      line("deer", "No."),
      line("protagonist", "Then what?"),
      line("deer", "I think you do not yet know who you will become here."),
      line("protagonist", "And do you know who you became?"),
      line("deer", "Unfortunately.")
    ],
    next: "deer_test"
  },

  deer_test: {
    characterKey: "deerNeutral",
    actor: "deer",
    background: "burnedForest",
    protagonistMood: "neutral",
    lines: [
      line("deer", "Answer honestly."),
      line("deer", "If we meet an infected animal and it is suffering, what will you do?"),
      line("protagonist", "What are the options?"),
      line("deer", "Save it. Leave. Kill it. Die. Usually everything comes down to that.")
    ],
    choices: [
      choice("I will try to help first", "deer_test_help"),
      choice("If it attacks, I will stop it", "deer_test_stop"),
      choice("I do not know", "deer_test_dontknow"),
      choice("I will try to run", "deer_test_run")
    ]
  },

  deer_test_help: {
    characterKey: "deerNeutral",
    actor: "deer",
    background: "burnedForest",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "I will try to help first."),
      line("deer", "That is what people say before they see infected creatures tear the living apart."),
      line("protagonist", "And shooting first is what people say after they have seen too much of it."),
      line("deer", "Careful."),
      line("protagonist", "I am not arguing. It is just… if we stop trying to help, how are we better than the fire?"),
      line("deer", "Fire is at least honest. It does not pretend to be kind."),
      line("protagonist", "But we can still be kind after it."),
      line("deer", "You lived behind walls for too long."),
      line("protagonist", "Maybe. But the walls did not teach me to treat death as normal.")
    ],
    next: "deer_bunker"
  },

  deer_test_stop: {
    characterKey: "deerNeutral",
    actor: "deer",
    background: "burnedForest",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "If it attacks, I will stop it."),
      line("deer", "Can you?"),
      line("protagonist", "I do not know. But I will try."),
      line("deer", "Trying often ends in graves here."),
      line("protagonist", "And certainty ends in mistakes."),
      line("deer", "Hm."),
      line("protagonist", "I do not want to kill anyone. But I do not want someone to die because I hesitated."),
      line("deer", "That is a good answer."),
      line("protagonist", "I do not like it."),
      line("deer", "Good answers rarely feel good.")
    ],
    next: "deer_bunker"
  },

  deer_test_dontknow: {
    characterKey: "deerNeutral",
    actor: "deer",
    background: "burnedForest",
    protagonistMood: "scared",
    lines: [
      line("protagonist", "I do not know."),
      line("deer", "At least that is honest."),
      line("protagonist", "I have just never been in that situation."),
      line("deer", "Then do not promise what you have never tested."),
      line("protagonist", "Do you always know what to do?"),
      line("deer", "No. I just learned how to look like I do.")
    ],
    next: "deer_bunker"
  },

  deer_test_run: {
    characterKey: "deerNeutral",
    actor: "deer",
    background: "burnedForest",
    protagonistMood: "scared",
    lines: [
      line("protagonist", "I will try to run."),
      line("deer", "That might not work."),
      line("protagonist", "Then why are you so pessimistic about everything?"),
      line("deer", "I am a realist. Outside the bunker, there is no time for comforting fantasies."),
      line("protagonist", "There were difficulties in the bunker too."),
      line("deer", "What kind?"),
      line("protagonist", "Who gets the last clean water. Who to trust. When to open the door."),
      line("protagonist", "Only there, nobody kept a rifle in plain sight."),
      line("deer", "…"),
      line("protagonist", "Do not think there was no cruelty underground."),
      line("deer", "Perhaps I underestimated you.")
    ],
    next: "deer_bunker"
  },

  deer_bunker: {
    characterKey: "deerNeutral",
    actor: "deer",
    background: "burnedForest",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "You look like you want to ask something."),
      line("deer", "What is it like to live underground while the world burns above you?"),
      line("protagonist", "At first it felt like we were safe."),
      line("protagonist", "There were filters, water, canned food, lamps. The adults said, 'We only need to wait.'"),
      line("deer", "And you waited."),
      line("protagonist", "Yes. Waiting is easy at first. Then it becomes work. Then punishment."),
      line("deer", "What was the worst part?"),
      line("protagonist", "The worst part was that nobody knew when we were allowed to live again."),
      line("deer", "And then you came out."),
      line("protagonist", "Yes."),
      line("deer", "And what did you feel?"),
      line("protagonist", "That I had not been released into the world, but into its funeral."),
      line("deer", "Now do you understand why I do not like other people's hope?"),
      line("protagonist", "I understand. But my hope is not someone else's. I brought it with me. It is small, but it is mine.")
    ],
    next: "deer_name"
  },

  deer_name: {
    characterKey: "deerNeutral",
    actor: "deer",
    background: "burnedForest",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "Listen, I never asked. What is your name?"),
      line("deer", "Peanut."),
      line("protagonist", "That sounds too cute for how serious you look."),
      line("deer", "…"),
      line("protagonist", "Peanut… if you could go back… would you want to?"),
      line("deer", "Before the fire?"),
      line("protagonist", "Yes."),
      line("deer", "I would want to hear the forest rustle with wind again, not with fire."),
      line("protagonist", "And I would want to see the sky before smog covered it."),
      line("deer", "You were a child of the bunker."),
      line("protagonist", "And you were a son of the forest."),
      line("deer", "And neither home saved us."),
      line("protagonist", "Then we need to find a way to save them earlier."),
      line("deer", "You talk as if time is a door."),
      line("protagonist", "I lived behind a door for years. Believe me, every door can be opened one day."),
      line("deer", "…"),
      line("deer", "Then go. But if we are looking for the past, first do not step on the future."),
      line("protagonist", "You mean the sprout?"),
      line("deer", "Yes. It is small. But maybe it is older than our hope.")
    ],
    next: "deer_to_bear"
  },

  deer_to_bear: {
    characterKey: "deerNeutral",
    actor: "deer",
    background: "burnedForest",
    protagonistMood: "neutral",
    gainPeanut: true,
    lines: [
      line("protagonist", "Do you know if there is anyone else nearby… alive and healthy?"),
      line("deer", "Depends on what you count as healthy. There is someone I know nearby…"),
      line("deer", "He is not healthy, but he will show you exactly how terrible the apocalypse was for the Earth."),
      line("protagonist", "I see. So where should I… actually, where should we go?"),
      line("deer", "To the old zoo. The Arctic Preservation Pavilion. Just stay close.")
    ],
    next: "bear_start"
  },

  bear_start: {
    characterKey: "bearNeutral",
    actor: "bear",
    background: "brokenZoo",
    protagonistMood: "scared",
    lines: [
      line("protagonist", "What is this place?"),
      line("deer", "A zoo."),
      line("protagonist", "I thought zoos were for children."),
      line("deer", "And for adults who liked looking at someone else's cage and calling it care."),
      line("protagonist", "Have you been here before?"),
      line("deer", "I heard about this place. Back then, the cooling systems still worked."),
      line("protagonist", "Cooling systems?"),
      line("deer", "For those people brought from the north. They said they were saving them from the melting ice."),
      line("protagonist", "And then?"),
      line("deer", "Then the heat came here too."),
      line("protagonist", "Is someone here?"),
      line("deer", "Yes."),
      line("protagonist", "You think so?"),
      line("deer", "I know."),
      line("bearUnknown", "Have people come to watch again?"),
      line("protagonist", "Who is there?"),
      line("bearUnknown", "Still asking questions through glass?"),
      line("text", "A polar bear steps out of the shadows. He is very tall, frightening, but sick and exhausted."),
      line("protagonist", "You…"),
      line("bearUnknown", "Do not say 'poor thing.' Your first word decides whether you stay alive."),
      line("deer", "Easy."),
      line("bearUnknown", "A deer with a rifle. How touching. An animal poacher."),
      line("deer", "I am not a poacher."),
      line("bearUnknown", "Everyone with a weapon says that."),
      line("protagonist", "We did not come to hurt you."),
      line("bearUnknown", "Of course. People never come to hurt anyone."),
      line("bearUnknown", "They come to save, study, feed on schedule, close doors, and promise to return."),
      line("protagonist", "I am not one of those people."),
      line("bearUnknown", "You are from a bunker. I hear it in your voice.")
    ],
    choices: [
      choice("I really do not want to hurt you", "bear_no_harm"),
      choice("What happened to you?", "bear_what_happened"),
      choice("Do you hate people?", "bear_hate_people"),
      choice("Peanut, lower the rifle", "bear_lower_gun")
    ]
  },

  bear_no_harm: {
    characterKey: "bearAngry",
    actor: "bear",
    background: "brokenZoo",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "I really do not want to hurt you."),
      line("bearUnknown", "What rare mercy. A girl walked into my cage and decided not to hurt me."),
      line("protagonist", "This is not a cage. The doors are open."),
      line("bearUnknown", "Open? Out there is heat. Ash. No ice, no fish, no snow."),
      line("bearUnknown", "The door is open, but there is nowhere to go."),
      line("protagonist", "I did not think."),
      line("bearUnknown", "People rarely think things through."),
      line("protagonist", "I did not build this place."),
      line("bearUnknown", "But you are part of the human world."),
      line("protagonist", "My world disappeared too."),
      line("bearUnknown", "No. Your world hid in a bunker. Mine melted."),
      line("deer", "Stop pushing her."),
      line("bearUnknown", "And you stay out of this, forest-dweller."),
      line("deer", "Say one more word."),
      line("protagonist", "Peanut, don't."),
      line("bearUnknown", "Fine. Let the girl speak. At least she still knows how to look guilty.")
    ],
    next: "bear_second_choice"
  },

  bear_what_happened: {
    characterKey: "bearNeutral",
    actor: "bear",
    background: "brokenZoo",
    protagonistMood: "scared",
    lines: [
      line("protagonist", "What happened to you?"),
      line("bearUnknown", "To me? Care happened to me."),
      line("protagonist", "What do you mean?"),
      line("bearUnknown", "They brought us here when the ice started disappearing too quickly."),
      line("bearUnknown", "People cried in front of cameras. They said they would not let us vanish."),
      line("bearUnknown", "We had cooled caves, artificial snow, pools, and wind that smelled of salt from special pipes."),
      line("protagonist", "So at first they really helped?"),
      line("bearUnknown", "At first, yes. That is the most disgusting part."),
      line("protagonist", "Why?"),
      line("bearUnknown", "Because if they had been monsters from the start, hatred would be easier."),
      line("protagonist", "And then they left?"),
      line("bearUnknown", "Not at once. First there was less food. Then the vets came less often."),
      line("bearUnknown", "Then they stopped cleaning the water. Then one of the coolers died, and the she-bear Snowflake began tearing out her fur from the heat."),
      line("protagonist", "Snowflake was your…"),
      line("bearUnknown", "Do not finish that sentence."),
      line("protagonist", "You were left alone?"),
      line("bearUnknown", "Yes. But loneliness came last. First came hunger. Then sickness. Then the smell of those who did not wake up.")
    ],
    next: "bear_second_choice"
  },

  bear_hate_people: {
    characterKey: "bearNeutral",
    actor: "bear",
    background: "brokenZoo",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "Do you hate people?"),
      line("bearUnknown", "No."),
      line("protagonist", "No?"),
      line("bearUnknown", "Hatred is too clean a feeling. I remember people."),
      line("protagonist", "Is that worse?"),
      line("bearUnknown", "I remember a little girl with braids. She came every Wednesday and pressed her palms to the glass."),
      line("bearUnknown", "I remember the doctor who cried when she put my brother down because his organs failed from the heat."),
      line("protagonist", "So not all of them were bad."),
      line("bearUnknown", "That is the horror of it."),
      line("protagonist", "Why?"),
      line("bearUnknown", "Because the kind ones left too."),
      line("protagonist", "Maybe they could not stay."),
      line("bearUnknown", "I did not want to stay either."),
      line("deer", "What were you called?"),
      line("bear", "North."),
      line("protagonist", "That is a beautiful name."),
      line("bear", "It is not a name. It is mockery when the north has been taken from you.")
    ],
    next: "bear_second_choice"
  },

  bear_lower_gun: {
    characterKey: "bearAngry",
    actor: "bear",
    background: "brokenZoo",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "Peanut, lower the rifle."),
      line("deer", "It is already lowered."),
      line("protagonist", "Lower."),
      line("bearUnknown", "What a brave little teacher."),
      line("protagonist", "He will not shoot if you do not attack."),
      line("bearUnknown", "And if I simply come closer?"),
      line("deer", "Do not."),
      line("bearUnknown", "And if I breathe in her scent? I have not smelled a living human this close in a long time."),
      line("protagonist", "I am not afraid."),
      line("deer", "You should be."),
      line("bearUnknown", "Listen to the deer. He knows what death smells like."),
      line("protagonist", "I want to talk."),
      line("bearUnknown", "People always want to talk once the cage is open and the food is gone."),
      line("protagonist", "I cannot change what happened."),
      line("bearUnknown", "Then why are you here?"),
      line("protagonist", "To understand whether someone can still be saved."),
      line("bearUnknown", "It is too late to save me.")
    ],
    next: "bear_second_choice"
  },

  bear_second_choice: {
    characterKey: "bearNeutral",
    actor: "bear",
    background: "brokenZoo",
    protagonistMood: "neutral",
    lines: [
      line("text", "North looks at you for a long, heavy moment. The pavilion smells of dust, old metal, and stale water."),
      line("bear", "Well? What else do you want to know, bunker girl?")
    ],
    choices: [
      choice("Tell me about the zoo before the disaster", "bear_zoo_before"),
      choice("Why did you not leave?", "bear_why_stayed"),
      choice("Did you eat other animals?", "bear_food"),
      choice("We can find you food or water", "bear_help")
    ]
  },

  bear_zoo_before: {
    characterKey: "bearNeutral",
    actor: "bear",
    background: "brokenZoo",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "Tell me what the zoo used to be like."),
      line("bear", "Luxurious."),
      line("protagonist", "Was that good?"),
      line("bear", "For visitors, yes. For us, it was complicated."),
      line("bear", "There was snow here. Not real snow. But cold."),
      line("bear", "Machines made it at night while children slept at home in warm beds."),
      line("bear", "In the morning they came and shouted, 'Look, a polar bear!'"),
      line("protagonist", "Did you like children?"),
      line("bear", "Sometimes. They did not pretend to understand."),
      line("bear", "Adults were worse. They read signs about extinction, nodded, bought coffee in plastic cups, and walked on."),
      line("protagonist", "And your own kind?"),
      line("bear", "Snowflake. My brother, Fang. Old Umka, the first bear they brought here."),
      line("bear", "He remembered real ice."),
      line("protagonist", "Did he tell you about it?"),
      line("bear", "Yes. I thought he was making up fairy tales. Now I would give anything to hear even one of his stories again.")
    ],
    next: "bear_angry_moment"
  },

  bear_why_stayed: {
    characterKey: "bearNeutral",
    actor: "bear",
    background: "brokenZoo",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "Why did you not leave when the doors opened?"),
      line("bear", "Where to?"),
      line("protagonist", "I do not know. Outside. Into the city. Toward water."),
      line("bear", "You came out of a bunker and do not know where to go either. Yet somehow you ask me."),
      line("protagonist", "I am just trying to understand."),
      line("bear", "I went out. Once."),
      line("bear", "The asphalt burned my paws. The air burned like acid."),
      line("protagonist", "And what was out there?"),
      line("bear", "Bodies. Empty kiosks. Dogs that were no longer dogs."),
      line("bear", "And the sun, everywhere."),
      line("protagonist", "You came back."),
      line("bear", "Yes. Outside was worse."),
      line("protagonist", "But you are dying here too."),
      line("bear", "I know. But here, at least I know which corner I will die in.")
    ],
    next: "bear_angry_moment"
  },

  bear_food: {
    characterKey: "bearAngry",
    actor: "bear",
    background: "brokenZoo",
    protagonistMood: "scared",
    lines: [
      line("protagonist", "Did you eat other animals?"),
      line("deer", "Do not ask like that."),
      line("bear", "No. Let her ask."),
      line("bear", "Children from bunkers should know what happens after the last can of food."),
      line("protagonist", "I did not mean…"),
      line("bear", "You wanted to know how much of a monster I am."),
      line("protagonist", "I wanted to understand how badly you starved."),
      line("bear", "That is the same thing."),
      line("bear", "First we ate feed. Then spoiled feed. Then rats."),
      line("bear", "Then birds that flew under the dome and could not find a way out. Then Fang died."),
      line("protagonist", "You…"),
      line("bear", "No. But I thought about it."),
      line("protagonist", "…"),
      line("bear", "Now you are looking properly. With horror."),
      line("deer", "Enough."),
      line("bear", "Why? You shot those you knew."),
      line("bear", "And I only thought about eating my dead brother to survive one more week."),
      line("deer", "I said enough."),
      line("bear", "Truth cuts deeper than bullets, doesn't it, deer?")
    ],
    next: "bear_angry_moment"
  },

  bear_help: {
    characterKey: "bearNeutral",
    actor: "bear",
    background: "brokenZoo",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "We can find you food or water."),
      line("bear", "We?"),
      line("protagonist", "Me and Peanut."),
      line("deer", "I did not promise that."),
      line("protagonist", "But you will help."),
      line("deer", "Do not decide for me."),
      line("bear", "How sweet. A girl found a starving beast and decided to feed him hope."),
      line("protagonist", "Not hope. Food."),
      line("bear", "Do you know how much a bear eats?"),
      line("protagonist", "No."),
      line("bear", "Do you know where to get fish in a world without rivers?"),
      line("protagonist", "No."),
      line("bear", "Do you know how to cool blood when your body was made for ice and the air around you is an oven?"),
      line("protagonist", "No."),
      line("bear", "Then do not say 'we can.'"),
      line("protagonist", "Maybe we cannot do everything. But we can do something."),
      line("bear", "What?"),
      line("protagonist", "Bring water. Find shade. Check the old refrigerators."),
      line("deer", "There may be technical reservoirs in the underground part of the zoo."),
      line("bear", "You knew and stayed silent?"),
      line("deer", "I did not know whether you were alive."),
      line("bear", "Now you know.")
    ],
    next: "bear_snowflake"
  },

  bear_angry_moment: {
    characterKey: "bearAngry",
    actor: "bear",
    background: "brokenZoo",
    protagonistMood: "scared",
    lines: [
      line("text", "After the conversation, North steps closer. His breathing is heavy and hoarse."),
      line("bear", "Tell me, bunker girl."),
      line("bear", "When you sat underground, did you have food?"),
      line("protagonist", "Yes."),
      line("bear", "Water?"),
      line("protagonist", "Yes."),
      line("bear", "Filters? Lamps? Doors that shut out the heat?"),
      line("protagonist", "Yes."),
      line("bear", "And we had glass walls so visitors could comfortably watch us die."),
      line("protagonist", "It is not my fault you were left here."),
      line("bear", "No. But you are just like them."),
      line("deer", "Step away from her."),
      line("bear", "You give orders in my cage?"),
      line("deer", "It is not a cage anymore."),
      line("bear", "Then why am I still here?")
    ],
    choices: [
      choice("I am not your enemy", "bear_not_enemy"),
      choice("You are keeping yourself in the cage", "bear_bad_attack"),
      choice("Do you want to become a monster?", "bear_monster_attack")
    ]
  },

  bear_not_enemy: {
    characterKey: "bearAngry",
    actor: "bear",
    background: "brokenZoo",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "I am not your enemy."),
      line("bear", "Then what are you?"),
      line("protagonist", "I want to help!"),
      line("bear", "Easy to say. You could be lying."),
      line("protagonist", "Why would I?"),
      line("bear", "People often lie to look kinder."),
      line("protagonist", "I do not want to look kinder. I want to stay alive. And I want you to stay alive too."),
      line("bear", "Why?"),
      line("protagonist", "Because if you die here, the cruel people win completely."),
      line("bear", "People already lost."),
      line("protagonist", "No. They lose only if everyone they abandoned stays here to die.")
    ],
    next: "bear_snowflake"
  },

  bear_bad_attack: {
    characterKey: "bearAggressive",
    actor: "bear",
    background: "brokenZoo",
    protagonistMood: "scared",
    lines: [
      line("protagonist", "Maybe you are keeping yourself in the cage."),
      line("bear", "What did you say?"),
      line("protagonist", "The doors are open. You can leave."),
      line("bear", "You think I do not leave because I do not want to?"),
      line("protagonist", "I think you are afraid."),
      line("bear", "Afraid?"),
      line("bear", "I was afraid when Snowflake died beside the broken cooler."),
      line("bear", "I was afraid when Fang called for the keeper for three days, and the keeper had already died of hunger."),
      line("bear", "I was afraid when I realized I was waiting for the people I hated."),
      line("protagonist", "I did not mean…"),
      line("bear", "No. You did. You wanted to say a pretty truth and watch it change me."),
      line("deer", "Back."),
      line("bear", "Now watch how it changes me."),
      line("text", "North lunges forward."),
      line("protagonist", "Peanut!"),
      line("text", "A shot rings out. North drops to one knee and roars heavily."),
      line("deer", "I warned you."),
      line("bear", "A deer… with a rifle… People do not even need to shoot for themselves anymore."),
      line("protagonist", "Did you kill him?"),
      line("deer", "No. Wounded him."),
      line("bear", "You should have killed me. I will not heal this wound anyway. I will only die later…"),
      line("protagonist", "No…"),
      line("bear", "Too late for pity. Pity always comes after the shot.")
    ],
    next: "bear_wounded_help"
  },

  bear_monster_attack: {
    characterKey: "bearAggressive",
    actor: "bear",
    background: "brokenZoo",
    protagonistMood: "angry",
    lines: [
      line("protagonist", "Do you want to become a monster?"),
      line("bear", "Repeat that."),
      line("protagonist", "You are angry at people for abandoning you. But now you want to attack someone who did not hurt you."),
      line("deer", "Enough."),
      line("protagonist", "No. He has to hear it."),
      line("bear", "Has to?"),
      line("protagonist", "Yes."),
      line("bear", "A little human came into my cage and decided what I have to do."),
      line("protagonist", "I am not the human who abandoned you."),
      line("bear", "But you are human."),
      line("protagonist", "Yes."),
      line("bear", "That is enough…"),
      line("deer", "Back!"),
      line("text", "A shot."),
      line("protagonist", "Peanut!"),
      line("deer", "Do not come closer!"),
      line("bear", "There… now… that is right. The evil beast is punished. The girl is saved. The hunter can sleep peacefully."),
      line("deer", "I do not sleep peacefully."),
      line("bear", "Then you are not completely a hunter yet."),
      line("protagonist", "North…"),
      line("bear", "Do not call me that. Names are for the living."),
      line("protagonist", "You are alive."),
      line("bear", "For now…")
    ],
    next: "bear_wounded_help"
  },

  bear_wounded_help: {
    characterKey: "bearAngry",
    actor: "bear",
    background: "brokenZoo",
    protagonistMood: "scared",
    lines: [
      line("protagonist", "Peanut, we have to help him."),
      line("deer", "He just tried to kill you."),
      line("protagonist", "I know."),
      line("deer", "Then why?"),
      line("protagonist", "Because if we leave now, we will be the same as those who abandoned him here."),
      line("bear", "And do not forget the rifle."),
      line("deer", "I shot because you attacked."),
      line("bear", "And I attacked because I thought I had to. You are an animal too. You should know instinct rules you."),
      line("bear", "I have not eaten… I do not even remember how long."),
      line("protagonist", "Then ask us to help."),
      line("bear", "What?"),
      line("protagonist", "Ask."),
      line("bear", "Finish me. I will not last long. Stop the suffering…"),
      line("protagonist", "What?! No! We will help you with food and water."),
      line("deer", "Let's go. He will not trust us right away."),
      line("protagonist", "But we will come back."),
      line("bear", "Everyone says that.")
    ],
    choices: [
      choice("We will help you", "bear_end"),
      choice("Peanut… make it quick", "bear_second_shot_dead")
    ]
  },

  bear_second_shot_dead: {
    characterKey: null,
    actor: null,
    background: "brokenZoo",
    protagonistMood: "scared",
    fullscreenImageKey: "shotDeath",
    lines: [
      line("protagonist", "Peanut… make it quick."),
      line("deer", "Are you sure?"),
      line("protagonist", "No. But he is asking us to stop the pain."),
      line("bear", "Do not pretend mercy is beautiful."),
      line("deer", "I am sorry."),
      line("text", "A second shot rings out."),
      line("text", "North does not rise again. The pavilion becomes too quiet."),
      line("protagonist", "Did we save him?"),
      line("deer", "No. We only ended what had already begun."),
      line("protagonist", "Then why does it hurt so much?"),
      line("deer", "Because you are not used to it yet."),
      line("protagonist", "I do not want to get used to it.")
    ],
    next: "heron_start"
  },

  bear_snowflake: {
    characterKey: "bearNeutral",
    actor: "bear",
    background: "brokenZoo",
    protagonistMood: "neutral",
    lines: [
      line("bear", "Snowflake loved the artificial snow."),
      line("protagonist", "The she-bear?"),
      line("bear", "Yes."),
      line("protagonist", "You told me not to ask about her."),
      line("bear", "I changed my mind."),
      line("protagonist", "I am listening."),
      line("bear", "She knew the snow was not real. Of course she knew."),
      line("bear", "But she still rolled in it like a cub."),
      line("bear", "Fang laughed at her. Umka said she was shaming the north."),
      line("bear", "And she answered, 'Even if the world gives you fake help, that is no reason to refuse real joy.'"),
      line("protagonist", "She sounds strong."),
      line("bear", "She was stronger than me."),
      line("protagonist", "What happened to her?"),
      line("bear", "When the second cooler broke, she stopped eating."),
      line("bear", "Then she began hitting the glass. Not to escape. To feel anything except heat."),
      line("protagonist", "North…"),
      line("bear", "I could not help her."),
      line("bear", "I was huge, strong, with a voice that made children cry. And completely useless against a broken machine."),
      line("protagonist", "You were there."),
      line("bear", "That is comfort for the living. The dead do not care who was there."),
      line("protagonist", "But you care."),
      line("bear", "Unfortunately, I still do."),
      line("protagonist", "Tell me more about her."),
      line("bear", "Why?"),
      line("protagonist", "So I know more than how she died."),
      line("bear", "She hated carrots."),
      line("protagonist", "They gave bears carrots?"),
      line("bear", "In an elite zoo, they gave anything that looked good in reports.")
    ],
    choices: [
      choice("Come with us", "bear_come_with_us"),
      choice("I do not know how to help you", "bear_dont_know_help")
    ]
  },

  bear_come_with_us: {
    characterKey: "bearNeutral",
    actor: "bear",
    background: "brokenZoo",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "Come with us."),
      line("deer", "That is dangerous."),
      line("bear", "For whom?"),
      line("deer", "For everyone."),
      line("protagonist", "He will not survive here alone."),
      line("bear", "And I will survive with you? I am big, sick, hungry, and angry."),
      line("bear", "Do you really want to walk beside that?"),
      line("protagonist", "I am already walking beside a deer who talks to ash and carries a poacher's rifle."),
      line("deer", "Thank you."),
      line("protagonist", "You're welcome."),
      line("bear", "You are both insane."),
      line("bear", "I will not go with you."),
      line("protagonist", "Why?"),
      line("bear", "I waited my whole life for an open door."),
      line("bear", "And when it opened, it turned out the door was the easiest part."),
      line("protagonist", "You can begin with one step."),
      line("bear", "I already tried. I do not want to crawl back in shame again."),
      line("protagonist", "… All right. Good luck.")
    ],
    next: "bear_end"
  },

  bear_dont_know_help: {
    characterKey: "bearNeutral",
    actor: "bear",
    background: "brokenZoo",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "I do not know how to help you."),
      line("bear", "Finally."),
      line("protagonist", "What?"),
      line("bear", "Truth without pretty flattery."),
      line("protagonist", "I want to help. But I do not know how."),
      line("bear", "A very stupid sentence."),
      line("protagonist", "I know."),
      line("bear", "Still… bring water. Do not promise salvation."),
      line("protagonist", "All right.")
    ],
    next: "bear_end"
  },

  bear_end: {
    characterKey: "bearNeutral",
    actor: "bear",
    background: "brokenZoo",
    protagonistMood: "neutral",
    lines: [
      line("text", "You leave the pavilion. North stays by the open door, but for the first time he looks not at the cage, but outside."),
      line("protagonist", "We cannot just leave."),
      line("deer", "We can. But that does not mean we forget."),
      line("protagonist", "Where now?"),
      line("deer", "To the old pond. If Grey is still alive, she knows the way to the station."),
      line("protagonist", "Grey?"),
      line("deer", "A heron. Wise, old, and very touchy. Most importantly, do not call her pond a swamp.")
    ],
    next: "heron_start"
  },

  heron_start: {
    characterKey: "heronNeutral",
    actor: "heron",
    background: "dryPond",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "Was this a swamp before?"),
      line("heron", "A pond."),
      line("deer", "Grey?.."),
      line("heron", "Peanut."),
      line("heron", "I did not think you were still alive."),
      line("deer", "I thought you had died too."),
      line("heron", "Almost."),
      line("protagonist", "You know each other?"),
      line("deer", "Yes. Before the fires, I sometimes came here for water."),
      line("deer", "You have been here all this time?"),
      line("heron", "Yes. Where else would I go?")
    ],
    choices: [
      choice("What happened to the pond?", "heron_pond"),
      choice("Why did you stay?", "heron_stayed"),
      choice("Are you dangerous?", "heron_danger"),
      choice("Do you know the way to the station?", "heron_station")
    ]
  },

  heron_pond: {
    characterKey: "heronNeutral",
    actor: "heron",
    background: "dryPond",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "What happened to your pond?"),
      line("heron", "First they polluted it. Then they began draining it. Then the heat came."),
      line("heron", "The water left, the fish died, the frogs went silent."),
      line("protagonist", "And you stayed."),
      line("heron", "Yes. Over time you get used to the fact that this wasteland was once your home. The home you still remember."),
      line("deer", "I remember it differently."),
      line("heron", "So do I. That makes staying here even harder.")
    ],
    next: "heron_station"
  },

  heron_stayed: {
    characterKey: "heronNeutral",
    actor: "heron",
    background: "dryPond",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "Why did you stay here?"),
      line("heron", "Because this is my home."),
      line("protagonist", "But it dried up."),
      line("heron", "Dried up does not mean gone."),
      line("protagonist", "Sorry. That was a stupid question.")
    ],
    next: "heron_station"
  },

  heron_danger: {
    characterKey: "heronAngry",
    actor: "heron",
    background: "dryPond",
    protagonistMood: "scared",
    lines: [
      line("protagonist", "Are you dangerous?"),
      line("heron", "No."),
      line("heron", "Only if you call my pond a swamp again."),
      line("protagonist", "Then I am safe."),
      line("heron", "For now, yes."),
      line("deer", "She will not attack. Grey just likes scaring people with words."),
      line("heron", "And you like scaring people with a rifle. Everyone has their style.")
    ],
    next: "heron_station"
  },

  heron_station: {
    characterKey: "heronNeutral",
    actor: "heron",
    background: "dryPond",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "Do you know anyone else alive nearby?"),
      line("heron", "I know there is a girl living near the power station by the city."),
      line("deer", "Have you seen her?"),
      line("heron", "A couple of times from a distance. I did not go close."),
      line("protagonist", "Why?"),
      line("heron", "Because I am old, not stupid."),
      line("protagonist", "Is she dangerous?"),
      line("heron", "I do not know."),
      line("heron", "She mutated after the explosion. Thin, pale, her hands glow in the dark. She talks without stopping."),
      line("protagonist", "About what?"),
      line("heron", "That she found a way to be saved. That there is a capsule somewhere."),
      line("heron", "That you can leave this world if you find the right approach."),
      line("deer", "Nonsense."),
      line("heron", "Maybe. Or maybe she really found something.")
    ],
    choices: [
      choice("What is her name?", "heron_amber_name"),
      choice("Do you think she lost her mind?", "heron_amber_mad"),
      choice("How should we talk to her?", "heron_amber_talk")
    ]
  },

  heron_amber_name: {
    characterKey: "heronNeutral",
    actor: "heron",
    background: "dryPond",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "What is her name?"),
      line("heron", "She calls herself Amber."),
      line("deer", "Her real name?"),
      line("heron", "I do not know. Maybe she forgot. Maybe she simply does not want to remember.")
    ],
    next: "heron_leave"
  },

  heron_amber_mad: {
    characterKey: "heronNeutral",
    actor: "heron",
    background: "dryPond",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "Do you think she lost her mind?"),
      line("heron", "I think too much happened to her."),
      line("heron", "Besides, she is still a child. In a way, just like you."),
      line("deer", "But she might be dangerous."),
      line("heron", "Yes. But so far I have not seen anything truly alarming.")
    ],
    next: "heron_leave"
  },

  heron_amber_talk: {
    characterKey: "heronNeutral",
    actor: "heron",
    background: "dryPond",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "How should we talk to her?"),
      line("heron", "Do not ask right away, 'What happened to you?' Better ask about the way out."),
      line("protagonist", "Why?"),
      line("heron", "Let her first talk about what she found."),
      line("heron", "Nobody knows exactly what happened to her. But she will probably not be happy if you start digging through those memories.")
    ],
    next: "heron_leave"
  },

  heron_leave: {
    characterKey: "heronNeutral",
    actor: "heron",
    background: "dryPond",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "Come with us. You know the road better than we do."),
      line("heron", "No."),
      line("protagonist", "Why?"),
      line("heron", "Because I am staying here."),
      line("protagonist", "By the pond?"),
      line("heron", "Yes."),
      line("protagonist", "But it is almost dead. If that girl really knows how to fix the situation…"),
      line("heron", "I am already too old for research expeditions."),
      line("heron", "Besides, there is no one else to guard this place."),
      line("heron", "I spent many months getting even a couple of weeds to break through here. This is my chance to save my home.")
    ],
    next: "heron_final_hint"
  },

  heron_final_hint: {
    characterKey: "heronNeutral",
    actor: "heron",
    background: "dryPond",
    protagonistMood: "neutral",
    lines: [
      line("heron", "Go east. You will reach the road to the city. There will be an old power line."),
      line("heron", "Follow where it leads and you will reach the city entrance."),
      line("deer", "And then?"),
      line("heron", "On the other side of the city there is a way into the industrial zone."),
      line("heron", "There is a road to the dormitories for nuclear plant workers. I think she settled somewhere there."),
      line("protagonist", "And the girl?"),
      line("heron", "If she is nearby, you will hear her before you see her.")
    ],
    next: "amber_start"
  },
    amber_start: {
    characterKey: "amberNeutral",
    actor: "amber",
    background: "toxicStation",
    protagonistMood: "scared",
    lines: [
      line("protagonist", "Is this the place?"),
      line("deer", "Looks like it."),
      line("protagonist", "Grey said that if we hear a voice, we should not interrupt."),
      line("amber", "No, no, no, if I put the capacitor here, the temporal shift burns out, and if I put it here, I burn out, which is technically also a result, but a very inconvenient one."),
      line("protagonist", "Did you hear that?"),
      line("deer", "Yes."),
      line("text", "A girl steps out of the darkness. She is small and thin, with tangled red hair."),
      line("text", "Parts of her skin glow faintly green, especially on her hands and near her neck."),
      line("amber", "Who are you? I have not seen you here before! Are you from the city? Did you come to help? Can you help me? I made this…"),
      line("protagonist", "Wait, wait. Are you Amber?"),
      line("text", "The girl freezes suddenly."),
      line("amber", "Who told you?"),
      line("protagonist", "Grey."),
      line("amber", "The heron is still alive?"),
      line("deer", "Thankfully. Do you live here alone?"),
      line("amber", "I do not live here. I work here. I have a laboratory downstairs."),
      line("protagonist", "We came to talk."),
      line("amber", "Everyone says that before they start asking strange questions.")
    ],
    choices: [
      choice("Grey said you found a way to be saved", "amber_escape"),
      choice("What happened to you?", "amber_what_happened"),
      choice("We do not want to hurt you", "amber_no_harm")
    ]
  },

  amber_escape: {
    characterKey: "amberNeutral",
    actor: "amber",
    background: "toxicStation",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "Grey said you found a way to be saved."),
      line("amber", "She said exactly that?"),
      line("protagonist", "Yes."),
      line("amber", "Good. That means she listened."),
      line("amber", "Everyone else hears 'time machine' and immediately starts laughing or praying."),
      line("deer", "Is it a time machine?"),
      line("amber", "No. Time machine is a movie term."),
      line("amber", "It is a time capsule."),
      line("protagonist", "A capsule usually stores things for the future."),
      line("amber", "Mine sends a living person into the past.")
    ],
    next: "amber_main"
  },

  amber_what_happened: {
    characterKey: "amberNeutral",
    actor: "amber",
    background: "toxicStation",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "What happened to you?"),
      line("amber", "There it is… straight to the bad question."),
      line("protagonist", "Sorry."),
      line("amber", "No, it is normal. Everyone asks."),
      line("deer", "She did not mean to hurt you."),
      line("amber", "I know, but it still hurts to hear."),
      line("protagonist", "Can I ask it differently?"),
      line("amber", "Ask what machine I built. At least that is about something I made myself.")
    ],
    next: "amber_main"
  },

  amber_no_harm: {
    characterKey: "amberNeutral",
    actor: "amber",
    background: "toxicStation",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "We do not want to hurt you."),
      line("amber", "I do not want to either, but sometimes I manage it by accident."),
      line("deer", "What does that mean?"),
      line("amber", "It means everything here is unstable. Especially me."),
      line("protagonist", "Are you dangerous?"),
      line("amber", "Sometimes. When I get scared. When someone grabs me…"),
      line("deer", "Then we will not.")
    ],
    next: "amber_main"
  },

  amber_main: {
    characterKey: "amberNeutral",
    actor: "amber",
    background: "toxicStation",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "Grey said you keep talking about a time machine."),
      line("amber", "Because the time CAPSULE exists."),
      line("deer", "Where?"),
      line("amber", "Downstairs. Under the station. There used to be an emergency center there."),
      line("protagonist", "And you managed to start the generator?"),
      line("amber", "Not exactly."),
      line("amber", "I built a time capsule from it. It can send one person back."),
      line("deer", "How far back?"),
      line("amber", "To the beginning of the irreversible chain."),
      line("amber", "Before the fires, before the explosion, before the evacuations, before everyone started saying 'too late.'"),
      line("protagonist", "Why are you not going yourself?"),
      line("amber", "Because the capsule will not accept me."),
      line("protagonist", "Why?"),
      line("amber", "Because of the mutation."),
      line("amber", "My body is unstable. If I enter, it will tear me apart between moments of time."),
      line("deer", "And it will accept her?"),
      line("amber", "Yes. She is healthy. She is from a bunker. She has less damage from the outside environment."),
      line("amber", "The capsule can handle her."),
      line("protagonist", "You want me to go into the past?"),
      line("amber", "Yes.")
    ],
    choices: [
      choice("Why me?", "amber_why_me"),
      choice("Can it kill me?", "amber_risk"),
      choice("What am I supposed to do in the past?", "amber_task"),
      choice("No. I cannot", "ending_bad")
    ]
  },

  amber_why_me: {
    characterKey: "amberNeutral",
    actor: "amber",
    background: "toxicStation",
    protagonistMood: "scared",
    lines: [
      line("protagonist", "Why me?"),
      line("amber", "Because you are not tied to this place."),
      line("protagonist", "I do not understand."),
      line("amber", "Peanut would return to his forest and try to save only that."),
      line("amber", "I would go back to my parents and ruin everything for them."),
      line("amber", "Grey would stay by her pond."),
      line("amber", "And you… you lost the whole world. Not one place. Besides, you are human."),
      line("protagonist", "That does not make me stronger."),
      line("deer", "She is a child."),
      line("amber", "So am I."),
      line("deer", "Exactly."),
      line("amber", "Adults have already broken everything. But they love children, and children can change everything.")
    ],
    next: "amber_past"
  },

  amber_risk: {
    characterKey: "amberNeutral",
    actor: "amber",
    background: "toxicStation",
    protagonistMood: "scared",
    lines: [
      line("protagonist", "Can it kill me?"),
      line("amber", "Yes."),
      line("text", "Peanut immediately steps forward."),
      line("deer", "Then no."),
      line("amber", "I am not offering it to you."),
      line("deer", "And I will not let her die in your basement."),
      line("amber", "She can die outside too."),
      line("amber", "From hunger, from heat, from infected water, from your rifle if you make a mistake one day."),
      line("deer", "Watch your words."),
      line("protagonist", "How big is the risk?"),
      line("amber", "Big."),
      line("amber", "But if the capsule works, you will wake up in the past. In your own body. Before the bunker. Before the end."),
      line("protagonist", "And if it does not work?"),
      line("amber", "Then you will not wake up.")
    ],
    next: "amber_past"
  },

  amber_task: {
    characterKey: "amberNeutral",
    actor: "amber",
    background: "toxicStation",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "What am I supposed to do in the past?"),
      line("amber", "Here. A list. It is not one person. You need a chain."),
      line("protagonist", "What kind?"),
      line("amber", "Warn them about the fires."),
      line("amber", "Stop the reduction of emergency systems at the station."),
      line("amber", "Make them evacuate the industrial district earlier."),
      line("amber", "Give the data to scientists, journalists, anyone who can make noise."),
      line("deer", "You think they will listen to a child?"),
      line("amber", "No. That is why she needs evidence."),
      line("amber", "Inside are the data: fire maps, accident dates, emission records, names of the dead, reports they hid."),
      line("amber", "If it appears before the events, someone will believe it."),
      line("protagonist", "Someone?"),
      line("amber", "I do not need everyone to believe. I need enough people to be frightened in time.")
    ],
    next: "amber_past"
  },

  amber_past: {
    characterKey: "amberNeutral",
    actor: "amber",
    background: "toxicStation",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "Tell me about your parents."),
      line("amber", "My mother was an engineer."),
      line("amber", "My father was a doctor in the emergency team."),
      line("amber", "We lived here, in the industrial city."),
      line("deer", "Did they work at the station?"),
      line("amber", "Not permanently. When the fires reached the outskirts, they were called in."),
      line("amber", "First to fight the fires, then to evacuate, then to 'help temporarily.'"),
      line("protagonist", "They were saving people?"),
      line("amber", "Yes. And they died because of it."),
      line("amber", "I was evacuated on the first day. They put me on a bus."),
      line("amber", "My mother gave me her pass and said, 'It is only for a couple of days.'"),
      line("protagonist", "And then there was an explosion?"),
      line("amber", "First, toxic vapor."),
      line("amber", "It reached us while we were still on the road. The bus filters could not handle it."),
      line("amber", "Someone was coughing. Someone shouted at the driver not to stop."),
      line("amber", "I remember the window becoming covered with a thick yellow film."),
      line("deer", "And you mutated."),
      line("amber", "Not immediately. First a fever. Then my skin began to glow…"),
      line("protagonist", "Did it hurt?"),
      line("amber", "Yes… But it hurt even more to know that the people I loved were not lucky in the same way.")
    ],
    choices: [
      choice("It is not your fault you survived", "amber_survived"),
      choice("Your parents would want you to live", "amber_parents"),
      choice("Do you want to save the world or bring them back?", "amber_world_or_parents"),
      choice("Show me the capsule", "amber_capsule")
    ]
  },

  amber_survived: {
    characterKey: "amberNeutral",
    actor: "amber",
    background: "toxicStation",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "It is not your fault you survived."),
      line("amber", "I know…"),
      line("protagonist", "I do not always understand why I survived either."),
      line("amber", "The bunker?"),
      line("protagonist", "Yes. I sat behind a door while everything outside changed."),
      line("amber", "And I was on a bus, looking back. The same guilt."),
      line("deer", "You were both children."),
      line("amber", "That is not an excuse.")
    ],
    next: "amber_capsule"
  },

  amber_parents: {
    characterKey: "amberNeutral",
    actor: "amber",
    background: "toxicStation",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "Your parents would want you to live."),
      line("amber", "I know."),
      line("protagonist", "Then…"),
      line("amber", "But they did not say, 'Live at any cost.'"),
      line("amber", "They said, 'Help everyone you can, especially the younger ones.'"),
      line("protagonist", "Do you miss them?"),
      line("amber", "Every minute.")
    ],
    next: "amber_capsule"
  },

  amber_world_or_parents: {
    characterKey: "amberNeutral",
    actor: "amber",
    background: "toxicStation",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "Do you want to save the world or bring them back?"),
      line("amber", "Yes."),
      line("protagonist", "That is not an answer."),
      line("amber", "It is an honest answer."),
      line("deer", "She has the right to want both."),
      line("amber", "Thank you."),
      line("amber", "I want them to live."),
      line("amber", "And I want the she-bear from the zoo to live. And Grey's pond not to dry out. And your forest not to burn."),
      line("amber", "My selfishness simply happens to match the common good."),
      line("protagonist", "And if it is impossible to save everyone?"),
      line("amber", "Then save as many as you can."),
      line("amber", "That is better than sitting in ruins and waiting to die next.")
    ],
    next: "amber_capsule"
  },

  amber_capsule: {
    characterKey: "amberNeutral",
    actor: "amber",
    background: "capsuleRoom",
    protagonistMood: "scared",
    lines: [
      line("protagonist", "Show me the capsule."),
      line("amber", "Yes. Good. Finally, a normal request."),
      line("text", "You descend to the lower level of the station."),
      line("protagonist", "Did you build this alone?"),
      line("amber", "Yes, with the help of notes left by the engineers who worked here."),
      line("deer", "It looks dangerous."),
      line("amber", "It is dangerous. But the world outside is not a utopia either."),
      line("protagonist", "How does it work?"),
      line("amber", "The capsule does not transfer a body that already exists in the past as a duplicate."),
      line("amber", "It sends consciousness back along its own timeline."),
      line("amber", "You will wake up in the past, but in the same clothes you wear now, with the things you brought, and you will remember everything."),
      line("protagonist", "And this future?"),
      line("amber", "If you succeed, it will change. If not, everything repeats."),
      line("deer", "And us?"),
      line("amber", "You may disappear. Change. Never meet."),
      line("amber", "That is how correction works. Have you heard of the butterfly effect?"),
      line("protagonist", "So I may never see you again?"),
      line("deer", "If it saves the forest, the pond, everyone else… then that is how it has to be.")
    ],
    choices: [
      choice("I will go", "amber_i_go"),
      choice("I am afraid", "amber_afraid"),
      choice("No. I cannot", "ending_bad")
    ]
  },

  amber_i_go: {
    characterKey: "amberNeutral",
    actor: "amber",
    background: "capsuleRoom",
    protagonistMood: "neutral",
    lines: [
      line("protagonist", "I will go."),
      line("deer", "Right away?"),
      line("protagonist", "If I think too long, I will change my mind."),
      line("amber", "That is not necessarily courage. Sometimes it is shock. But it works."),
      line("protagonist", "What should I take?"),
      line("amber", "The data. And this."),
      line("text", "Amber gives you a small photograph of her parents."),
      line("protagonist", "Why?"),
      line("amber", "If you meet them… No. When you meet them, tell them Amber understood everything."),
      line("amber", "Just do not immediately say I am their daughter from the future. They are smart, but not that calm.")
    ],
    next: "amber_launch"
  },

  amber_afraid: {
    characterKey: "amberNeutral",
    actor: "amber",
    background: "capsuleRoom",
    protagonistMood: "scared",
    lines: [
      line("protagonist", "I am afraid."),
      line("amber", "Good."),
      line("protagonist", "I do not know if I can do it."),
      line("amber", "I do not know either."),
      line("amber", "But at least you can try. I cannot."),
      line("deer", "No one is ever ready for something like this."),
      line("protagonist", "Then I will go. I just… need to be afraid and go anyway."),
      line("amber", "That works.")
    ],
    next: "amber_launch"
  },

  amber_launch: {
    characterKey: "amberNeutral",
    actor: "amber",
    background: "capsuleRoom",
    protagonistMood: "scared",
    lines: [
      line("amber", "When you reach the past, you will have little time."),
      line("amber", "First they will not believe you. Then they will try to use you."),
      line("amber", "Do not expect people to do the right thing immediately."),
      line("protagonist", "What should I expect?"),
      line("amber", "That someone will still hear you."),
      line("amber", "And tell my parents to leave before the second call."),
      line("amber", "They will not ignore the first one. That is who they are. But the second… the second will kill them."),
      line("protagonist", "I will try."),
      line("amber", "Lie down. Hold the container tightly."),
      line("amber", "If it feels like something is calling you back, do not return."),
      line("protagonist", "Why?"),
      line("amber", "A side effect that may affect the success of the mission."),
      line("deer", "Are you ready?"),
      line("protagonist", "No."),
      line("deer", "No one is ready for this."),
      line("amber", "Remember the most important thing: do not try to convince the world that it will die."),
      line("amber", "Convince it that it can still change everything."),
      line("protagonist", "And if they do not want to? If they do not believe me?"),
      line("amber", "Then make them see the consequences."),
      line("amber", "Launch in three…"),
      line("amber", "Two…"),
      line("amber", "One…"),
      line("text", "Everything turns white.")
    ],
    next: "ending_good"
  },

  ending_good: {
    characterKey: null,
    actor: null,
    background: "intro",
    protagonistMood: "neutral",
    isFinal: true,
    lines: [
      line("text", "You open your eyes."),
      line("text", "You are lying in your old room. Outside the window is a normal sky."),
      line("text", "Not yellow, not green, not covered in smoke. Ordinary."),
      line("text", "A voice comes from the kitchen. The television talks about a hot summer, but the presenter smiles as if it is only weather."),
      line("text", "Amber's metal container lies on the table beside you."),
      line("protagonist", "It worked."),
      line("text", "You walk to the window. Outside, people go about their lives. Cars hum. The trees are still green."),
      line("text", "Somewhere far away, the future you have already seen dead is being built."),
      line("ending", "Good ending")
    ],
    next: null
  },

  ending_bad: {
    characterKey: null,
    actor: null,
    background: "capsuleRoom",
    protagonistMood: "angry",
    isFinal: true,
    lines: [
      line("protagonist", "No. I cannot."),
      line("amber", "I see."),
      line("deer", "She is not obligated to die in your machine."),
      line("amber", "I know."),
      line("amber", "It is just horrible to understand that the chance was so close."),
      line("protagonist", "I am sorry."),
      line("text", "The capsule remains open, but there is no movement inside it anymore. The light slowly fades."),
      line("text", "Outside, the station hums, as if the world is still breaking somewhere beyond the walls."),
      line("ending", "Bad ending")
    ],
    next: null
  }
};

// Changes the current scene and resets dialogue progress.
function setScene(id) {
  currentSceneId = id;
  const scene = scenes[id];

  if (!scene) {
    console.error("Scene not found:", id);
    return;
  }

  if (scene.gainPeanut) {
    hasPeanutCompanion = true;
  }

  currentLines = scene.lines || [];
  choices = scene.choices || [];
  lineIndex = 0;
  showingChoices = false;

  updateAmbientSound();
  playShotIfNeeded();
}

// Moves to the next dialogue line, choice, or scene.
function advanceDialogue() {
  const scene = scenes[currentSceneId];

  if (!scene) {
    console.error("Scene not found:", currentSceneId);
    return;
  }

  if (scene.isFinal) return;

  if (lineIndex < currentLines.length - 1) {
    lineIndex++;
    playShotIfNeeded();
    return;
  }

  if (choices.length > 0) {
    showingChoices = true;
    return;
  }

  if (scene.next) {
    setScene(scene.next);
  }
}

// Applies the selected choice.
function selectChoice(index) {
  const picked = choices[index];
  if (!picked) return;
  setScene(picked.next);
}

// Checks which choice button was clicked.
function handleChoiceClick(mx, my) {
  const startY = H - 365;
  const choiceW = 790;
  const choiceH = 52;
  const gap = 12;
  const x = 40;

  for (let i = 0; i < choices.length; i++) {
    const y = startY + i * (choiceH + gap);

    if (mx >= x && mx <= x + choiceW && my >= y && my <= y + choiceH) {
      selectChoice(i);
      return;
    }
  }
}
// Draws the loading screen.
function drawLoadingScreen() {
  background(8, 8, 11);

  let percent = 0;
  if (totalCount > 0) {
    percent = floor((loadedCount / totalCount) * 100);
  }

  noStroke();

  for (let i = 0; i < 90; i++) {
    const x = noise(i * 10, frameCount * 0.005) * W;
    const y = noise(i * 25, frameCount * 0.005) * H;
    fill(255, 255, 255, 25);
    circle(x, y, 2);
  }

  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(46);
  fill(235);
  text("Loading", W / 2, H / 2 - 105);

  textSize(34);
  fill(200, 230, 255);
  text(`${percent}%`, W / 2, H / 2 - 42);

  const barW = 560;
  const barH = 30;
  const barX = W / 2 - barW / 2;
  const barY = H / 2 + 10;

  noFill();
  stroke(180, 200, 220, 160);
  strokeWeight(2);
  rect(barX, barY, barW, barH, 12);

  noStroke();
  fill(120, 190, 255, 220);
  rect(barX + 4, barY + 4, (barW - 8) * (percent / 100), barH - 8, 9);

  textStyle(NORMAL);
  textSize(18);
  fill(180);

  if (!loadFailed) {
    text(`Assets loaded: ${loadedCount} / ${totalCount}`, W / 2, H / 2 + 80);
  }

  if (loadFailed) {
    fill(255, 90, 90);
    textSize(22);
    text("Asset loading error", W / 2, H / 2 + 95);

    fill(230);
    textSize(17);
    text(loadFailMsg, W / 2, H / 2 + 130);

    fill(180);
    textSize(15);
    text("Check the file name and path in assets, backgrounds, or sounds", W / 2, H / 2 + 160);
  }
}

// Draws the title screen.
function drawStartScreen() {
  background(8, 8, 11);

  drawVignette();

  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(52);
  fill(245);
  text("Ashy Snow", W / 2, H / 2 - 170);

  textStyle(NORMAL);
  textSize(22);
  fill(205);
  text("Enter the protagonist's name", W / 2, H / 2 - 105);

  nameInput.show();
  startButton.show();

  nameInput.position(W / 2 - 180, H / 2 - 45);
  nameInput.size(360, 38);
  nameInput.style("font-size", "20px");
  nameInput.style("padding", "6px 10px");
  nameInput.style("border-radius", "10px");
  nameInput.style("border", "1px solid #cccccc");
  nameInput.style("background", "#eeeeee");

  startButton.position(W / 2 - 105, H / 2 + 35);
  startButton.size(210, 46);
  startButton.style("font-size", "20px");
  startButton.style("border-radius", "12px");
  startButton.style("background", "#ffffff");
}

// Draws the background for the current scene.
function drawSceneBackground() {
  const scene = scenes[currentSceneId];
  if (!scene) return;

  const bg = scene.background;

  const bgMap = {
    intro: "exited",
    burnedForest: "forest",
    dryPond: "swamp",
    toxicStation: "lab",
    capsuleRoom: "lab",
    brokenZoo: "zoo"
  };

  const imageKey = bgMap[bg];

  if (imageKey && backgrounds[imageKey]) {
    imageMode(CORNER);
    image(backgrounds[imageKey], 0, 0, W, H);
    drawDarkOverlay();
    drawVignette();
    return;
  }

  background(18, 19, 23);
  noStroke();
  fill(255, 255, 255, 8);
  rect(0, 0, W, H);
  drawMissingBgLabel(bg);
  drawVignette();
 
}

// Adds a dark layer over the background.
function drawDarkOverlay() {
  noStroke();
  fill(0, 0, 0, 65);
  rect(0, 0, W, H);
}



// Draws dark edges around the screen.
function drawVignette() {
  noFill();
  for (let i = 0; i < 12; i++) {
    stroke(0, 0, 0, 10);
    strokeWeight(28);
    rect(i * 8, i * 8, W - i * 16, H - i * 16, 18);
  }
}

// Draws the main character on the left side.
function drawCharacterLeft() {
  const scene = scenes[currentSceneId];
  if (!scene || !scene.characterKey) return;

  if (shouldHideBearForReveal(scene)) return;

  const key = scene.characterKey;
  const actor = scene.actor;
  const img = sprites[key];
  if (!img) return;

  push();
  imageMode(CENTER);

  let x = W * 0.25;
  let y = H * 0.49;
  let scale = 1.55;

  if (key.includes("heron")) {
    x = W * 0.24;
    y = H * 0.47;
    scale = 1.55;
  } else if (key.includes("bear")) {
    x = W * 0.27;
    y = H * 0.51;
    scale = 1.55;
  } else if (key.includes("deer")) {
    x = W * 0.27;
    y = H * 0.49;
    scale = 1.75;
  } else if (key.includes("amber")) {
    x = W * 0.26;
    y = H * 0.50;
    scale = 1.22;
  }

  const alpha = getCharacterAlpha(actor);
  const flip = key.includes("bear");

  drawSprite(img, x, y, scale, alpha, flip);
  pop();
}

// Hides North before his reveal line.
function shouldHideBearForReveal(scene) {
  if (currentSceneId !== "bear_start") return false;
  if (!scene.characterKey || !scene.characterKey.includes("bear")) return false;
  return lineIndex < 17;
}

// Draws a sprite with scale, opacity, and optional horizontal flip.
function drawSprite(img, x, y, scaleFactor, alpha = 255, flipX = false) {
  const ratio = img.height / img.width;
  const w = 520 * scaleFactor;
  const h = w * ratio;

  noStroke();
  fill(0, 0, 0, 85);
  ellipse(x, H - 90, w * 0.55, 60);

  push();
  translate(x, y);

  if (flipX) scale(-1, 1);

  tint(255, alpha);
  image(img, 0, 0, w, h);
  noTint();
  pop();
}

// Selects the protagonist sprite based on mood.
function getProtagonistSprite() {
  const scene = scenes[currentSceneId];

  if (scene && scene.protagonistMood === "angry") return "girlAngry";
  if (scene && scene.protagonistMood === "scared") return "girlScared";
  return "girlNeutral";
}

// Draws characters on the right side.
function drawRightSide() {
  drawPeanutRight();
  drawProtagonistRight();
}

// Draws Peanut as the companion.
function drawPeanutRight() {
  if (!hasPeanutCompanion) return;

  const scene = scenes[currentSceneId];
  if (scene && scene.actor === "deer") return;

  const img = sprites.deerNeutral;
  if (!img) return;

  const alpha = getCharacterAlpha("deer");

  push();
  imageMode(CENTER);

  const x = W * 0.57;
  const y = H * 0.50;

  const ratio = img.height / img.width;
  const w = 850;
  const h = w * ratio;

  noStroke();
  fill(0, 0, 0, 70);
  ellipse(x, H - 88, w * 0.55, 52);

  tint(255, alpha);
  image(img, x, y, w, h);
  noTint();

  fill(255, 255, 255, 80);
  textAlign(CENTER, CENTER);
  textSize(14);
  textStyle(NORMAL);
  text(getSpeakerName("deer"), x, H - 45);

  pop();
}

// Draws the protagonist on the right side.
function drawProtagonistRight() {
  const imgKey = getProtagonistSprite();
  const img = sprites[imgKey];
  if (!img) return;

  const alpha = getCharacterAlpha("protagonist");

  push();
  imageMode(CENTER);

  const x = W * 0.80;
  const y = H * 0.51;

  const ratio = img.height / img.width;
  const w = 660;
  const h = w * ratio;

  noStroke();
  fill(0, 0, 0, 85);
  ellipse(x, H - 90, w * 0.55, 58);

  push();
  translate(x, y);
  scale(-1, 1);
  tint(255, alpha);
  image(img, 0, 0, w, h);
  noTint();
  pop();

  noStroke();
  fill(255, 255, 255, 90);
  textAlign(CENTER, CENTER);
  textSize(16);
  textStyle(NORMAL);
  text(getPlayerName(), x, H - 45);

  pop();
}

// Draws a full-screen sprite for special scenes.
function drawFullscreenSprite(imageKey) {
  const img = sprites[imageKey];
  if (!img) return;

  push();
  imageMode(CENTER);

  const ratio = img.height / img.width;
  let w = 760;
  let h = w * ratio;

  if (h > 520) {
    h = 520;
    w = h / ratio;
  }

  noStroke();
  fill(0, 0, 0, 120);
  rect(0, 0, W, H);

  image(img, W / 2, H / 2 - 45, w, h);
  pop();
}

// Checks if Amber's family photo should be shown.
function shouldShowFamilyPhoto() {
  return currentSceneId === "amber_i_go" && lineIndex >= 6;
}

// Draws a full-screen background image.
function drawFullscreenBackground(imageKey) {
  const img = backgrounds[imageKey];
  if (!img) return;

  imageMode(CORNER);
  image(img, 0, 0, W, H);

  noStroke();
  fill(0, 0, 0, 55);
  rect(0, 0, W, H);

  drawVignette();
}

// Draws the dialogue box and current line.
function drawDialogueBox() {
  if (currentLines.length === 0) return;

  const current = currentLines[lineIndex];

  const boxX = 35;
  const boxY = H - 200;
  const boxW = W - 70;
  const boxH = 165;

  noStroke();
  fill(0, 0, 0, 175);
  rect(boxX + 7, boxY + 9, boxW, boxH, 18);

  fill(18, 20, 25, 238);
  stroke(220, 230, 245, 130);
  strokeWeight(2);
  rect(boxX, boxY, boxW, boxH, 18);

  fill(35, 38, 48, 250);
  stroke(220, 230, 245, 120);
  rect(boxX + 24, boxY - 30, 340, 44, 12);

  noStroke();
  fill(255);
  textSize(22);
  textStyle(BOLD);
  textAlign(LEFT, BASELINE);
  text(getSpeakerName(current.speaker), boxX + 42, boxY - 1);

  textStyle(NORMAL);
  fill(235);
  textSize(23);
  textAlign(LEFT, TOP);
  textWrap(WORD);
  text(getText(current), boxX + 35, boxY + 34, boxW - 70, boxH - 45);
}

// Draws the choice buttons.
function drawChoices() {
  const startY = H - 365;
  const choiceW = 790;
  const choiceH = 52;
  const gap = 12;
  const x = 40;

  for (let i = 0; i < choices.length; i++) {
    const y = startY + i * (choiceH + gap);

    const hovered =
      mouseX >= x &&
      mouseX <= x + choiceW &&
      mouseY >= y &&
      mouseY <= y + choiceH;

    noStroke();
    fill(0, 0, 0, 145);
    rect(x + 5, y + 5, choiceW, choiceH, 12);

    if (hovered) {
      fill(76, 88, 112, 248);
      stroke(245, 245, 255, 190);
    } else {
      fill(30, 34, 43, 242);
      stroke(175, 185, 205, 120);
    }

    strokeWeight(2);
    rect(x, y, choiceW, choiceH, 12);

    noStroke();
    fill(245);
    textSize(18);
    textStyle(NORMAL);
    textAlign(LEFT, CENTER);
    text(`${i + 1}. ${getText(choices[i])}`, x + 22, y + choiceH / 2);
  }
}

// Draws the final ending screen.
function drawEndingPage() {
  const scene = scenes[currentSceneId];
  if (!scene) return;

  const isGoodEnding = currentSceneId === "ending_good";

  if (isGoodEnding && backgrounds.young) {
    imageMode(CORNER);
    image(backgrounds.young, 0, 0, W, H);
    noStroke();
    fill(0, 0, 0, 80);
    rect(0, 0, W, H);
  } else if (!isGoodEnding && backgrounds.lab) {
    imageMode(CORNER);
    image(backgrounds.lab, 0, 0, W, H);
    noStroke();
    fill(0, 0, 0, 95);
    rect(0, 0, W, H);
  } else {
    background(8, 8, 11);
  }

  drawVignette();

  const title = isGoodEnding ? "Good Ending" : "Bad Ending";

  const bodyText = scene.lines
    .filter(l => l.speaker !== "ending")
    .map(l => getText(l))
    .join(" ");

  const textW = 700;
  const textX = W / 2 - textW / 2;

  noStroke();
  fill(255);
  textAlign(CENTER, TOP);
  textStyle(BOLD);
  textSize(44);
  text(title, W / 2, 70);

  fill(245);
  textStyle(NORMAL);
  textSize(20);
  textLeading(30);
  textAlign(CENTER, TOP);
  text(bodyText, textX, 500, textW, 220);
}