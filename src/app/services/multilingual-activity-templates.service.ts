import { MultilingualActivityContent } from '../types/multilingual-activity-content.types';

export class MultilingualActivityTemplates {
  
  static getTemplate(activityTypeId: number): string {
    const templates: { [key: number]: () => string } = {
      // Only activity types 1-4 are implemented
      1: () => this.getFlashcardTemplate(),
      2: () => this.getMatchingTemplate(),
      3: () => this.getFillInTheBlanksTemplate(),
      4: () => this.getMCQActivityTemplate(),
      5: () => this.getTrueFalseTemplate(),
      6: () => this.getSongPlayerTemplate(),
      7: () => this.getStoryPlayerTemplate(),
      8: () => this.getPronunciationActivityTemplate(),
      9: () => this.getScrumbleActivityTemplate(),
      10:() => this.getTripleblastActivityTemplate(),
      11:() => this.getBubbleblastActivityTemplate(),
      12:() => this.getmemorypairActivityTemplate(),
      13:() => this.getgroupsorterActivityTemplate()     
    };

    const templateFunction = templates[activityTypeId];
    return templateFunction ? templateFunction() : this.getDefaultTemplate();
  }

  private static getFlashcardTemplate(): string {
    return JSON.stringify({
        "id": "1",
        "referenceTitle": {
        "ta": "எழுத்துக்கள்",
        "en": "Letters / Alphabet",
        "si": "අක්ෂර / හෝඩිය"
        },
        "label": {
        "ta": "அ (A)",
        "en": "A (Pronounced Ei)",
        "si": "අ (A)"
        },
        "imageUrl": {
        "ta": "/images/alphabet/ta/a.png",
        "en": "/images/alphabet/en/a.png",
        "si": "/images/alphabet/si/a.png"
        },
        "word": {
        "ta": "அ",
        "en": "A",
        "si": "අ"
        },
        "audioUrl": {
        "ta": "/audio/ta/a.mp3",
        "en": "/audio/en/a.mp3",
        "si": "/audio/si/a.mp3"
        }
      }, null, 2);
  }

  private static getMCQActivityTemplate(): string {
    return JSON.stringify({
      "title": { 
        "ta": "சரியான விடையைத் தேர்ந்தெடுக்கவும்", 
        "en": "Multiple Choice Questions", 
        "si": "නිවැරදි පිළිතුර තෝරන්න" 
      },
      "instruction": { 
        "ta": "கேள்வியைப் படித்து, சரியான பதிலைத் தேர்ந்தெடுக்கவும்.", 
        "en": "Read the question and select the correct answer.", 
        "si": "ප්‍රශ්නය කියවා නිවැරදි පිළිතුර තෝරන්න." 
      },
      "questions": [
        {
          "questionId": "MQ1",
          "question": {
            "type": "text",
            "content": { 
              "ta": "கீழ்க்கண்டவற்றில் எது பழம்?", 
              "en": "Which of the following is a fruit?", 
              "si": "පලතුරක් යනු කුමක්ද?" 
            }
          },
          "answerType": "text",
          "options": [
            { 
              "content": { "ta": "நாய்", "en": "Dog", "si": "බල්ලා" }, 
              "isCorrect": false 
            },
            { 
              "content": { "ta": "ஆப்பிள்", "en": "Apple", "si": "ඇපල්" }, 
              "isCorrect": true 
            },
            { 
              "content": { "ta": "கார்", "en": "Car", "si": "කාර්" }, 
              "isCorrect": false 
            }
          ]
        }
      ]
    }, null, 2);
  }

  private static getFillInTheBlanksTemplate(): string {
    return JSON.stringify({
      "title": {
        "ta": "வெற்றிடங்களை நிரப்பவும்",
        "en": "Fill in the Blanks",
        "si": "හිස් තැන් පුරවන්න"
      },
      "instruction": {
        "ta": "வாக்கியத்தில் உள்ள வெற்றிடங்களை சரியான வார்த்தைகளால் நிரப்பவும்.",
        "en": "Fill in the blanks in the sentence with the correct words.",
        "si": "වාක්‍යයේ හිස් තැන් නිවැරදි වචන වලින් පුරවන්න."
      },
      "questions": [
        {
          "sentenceId": "S1",
          "segments": [
            {
              "type": "TEXT",
              "content": {
                "ta": "நான்",
                "en": "I",
                "si": "මම"
              }
            },
            {
              "type": "BLANK",
              "content": {
                "ta": "பள்ளிக்கூடம்",
                "en": "school",
                "si": "පාසල"
              },
              "hint": {
                "ta": "கல்வி இடம்",
                "en": "Place of education",
                "si": "අධ්‍යාපන ස්ථානය"
              }
            },
            {
              "type": "TEXT",
              "content": {
                "ta": "போகிறேன்",
                "en": "go",
                "si": "යනවා"
              }
            }
          ],
          "options": [
            {
              "ta": "பள்ளிக்கூடம்",
              "en": "school",
              "si": "පාසල"
            },
            {
              "ta": "வீடு",
              "en": "home",
              "si": "ගෙදර"
            },
            {
              "ta": "கடை",
              "en": "shop",
              "si": "ගබඩාව"
            }
          ]
        }
      ]
    }, null, 2);
  }

  private static getDefaultTemplate(): string {
    return JSON.stringify({
      title: {
        ta: "செயல்பாட்டின் தலைப்பு",
        en: "Activity Title",
        si: "ක්‍රියාකාරකමේ මාතෘකාව"
      },
      instruction: {
        ta: "வழிமுறைகள்",
        en: "Instructions",
        si: "උපදෙස්"
      },
      content: {
        ta: "உள்ளடக்கம்",
        en: "Content",
        si: "අන්තර්ගතය"
      }
    }, null, 2);
  }

  // Activity Type 2: Matching
  private static getMatchingTemplate(): string {
    return JSON.stringify({    
      "title": { "ta": "பொருத்துக", "en": "Match the Pairs", "si": "යුගල ගලපන්න" },
      "instruction": { "ta": "சரியான இணைகளைத் தேர்ந்தெடுக்கவும்.", "en": "Select the correct corresponding pairs.", "si": "නිවැරදි යුගල තෝරන්න." },
      "cards": [
        // --- Side A Cards (ஒரு பக்கம்) ---
        {
          "id": "A1",
          "matchId": "P1", // இந்த அட்டை P1 ஐடியுடன் பொருந்தும்
          "side": "A",
          "type": "text", 
          "content": { "ta": "நாய்", "en": "Dog", "si": "බල්ලා" } 
        },
        {
          "id": "A2",
          "matchId": "P2",
          "side": "A",
          "type": "audio", // 🎧 Img - Audio ஜோடிக்காக ஆடியோ இங்கே
          "content": { "ta": "/audio/cat.mp3", "en": "/audio/cat.mp3", "si": "/audio/cat.mp3" } 
        },
        
        // --- Side B Cards (மறு பக்கம்) ---
        {
          "id": "B1",
          "matchId": "P1",
          "side": "B",
          "type": "image", // 🖼️ Img - Text ஜோடிக்காக Image இங்கே
          "content": { "default": "/images/animals/dog.png" } 
        },
        {
          "id": "B2",
          "matchId": "P2",
          "side": "B",
          "type": "text", 
          "content": { "ta": "பூனை", "en": "Cat", "si": "පූසා" } 
        }
        // Client App: இந்த லிஸ்டைப் பெற்று, side-ஐப் பொருட்படுத்தாமல் அனைத்தையும் குழப்பி (shuffle) காண்பிக்கும். 
        // இரண்டு அட்டைகளின் 'matchId' சமமாக இருந்தால், அவை இணைகள் என்று Client App முடிவு செய்யும்.
      ]
    }, null, 2);
  }

  private static getTrueFalseTemplate(): string {
    return JSON.stringify({    
      "title": {
        "ta": "மெய் அல்லது பொய்",
        "en": "True or False",
        "si": "සැබෑද අසත්‍යද"
      },
      "instruction": {
        "ta": "கூற்றை வாசித்து, மெய் அல்லது பொய் என்பதைத் தேர்ந்தெடுக்கவும்.",
        "en": "Read the statement and choose whether it is true or false.",
        "si": "ප්‍රකාශය කියවා, එය සැබෑද අසත්‍යද යන්න තෝරන්න."
      },
      "questions": [
        {
          "questionId": "TF1",
          "questionType": "trueFalse",
          "statement": {
            "ta": "சூரியன் மேற்கில் உதிக்கிறது.",
            "en": "The sun rises in the west.",
            "si": "හිරු බටහිරින් උදාවෙයි."
          },
          "options": [
            { "label": { "ta": "மெய்", "en": "True", "si": "සැබෑ" }, "value": true },
            { "label": { "ta": "பொய்", "en": "False", "si": "අසත්‍ය" }, "value": false }
          ],
          "correctAnswer": false
        }
      ]     
    }, null, 2);
  }

  private static getSongPlayerTemplate(): string {
    return JSON.stringify({
        "title": { 
          "ta": "பாடல் பயிற்சி", 
          "en": "Song Activity", 
          "si": "ගීත පුහුණුව" 
        },
        "instruction": { 
          "ta": "பாடல் வரிகளைப் பின்பற்றிப் பாடுங்கள்.", 
          "en": "Follow the lyrics and sing along.", 
          "si": "පද රචනය අනුගමනය කරන්න." 
        },
        "songData": {
          "title": { 
            "ta": "நிலா நிலா ஓடி வா", 
            "en": "Moon, Moon, Come Running", 
            "si": "සඳ සඳ දුව එන්න" 
          },
          "artist": "Traditional",
          "albumArtUrl": "/images/nila_nila_album_art.jpg",
          "audioUrl": { 
            "ta": "/audio/nila_ta.mp3", 
            "en": "/audio/nila_en.mp3",
            "si": "/audio/nila_si.mp3"
          },
          "lyrics": [
            { 
              "content": { 
                "ta": "நிலா நிலா ஓடி வா", 
                "en": "Moon, moon, come running",
                "si": "සඳ සඳ දුව එන්න"
              }, 
              "timestamp": 2.5 
            },
            { 
              "content": { 
                "ta": "நில்லாமல் ஓடி வா", 
                "en": "Run without stopping",
                "si": "නවතින්නේ නැතුව දුව එන්න"
              }, 
              "timestamp": 5.0 
            },
            { 
              "content": { 
                "ta": "மலை மேலே ஏறி வா", 
                "en": "Climb up the mountain and come",
                "si": "කන්ද උඩ නැග එන්න"
              }, 
              "timestamp": 7.8 
            },
            { 
              "content": { 
                "ta": "மல்லிகைப் பூ கொண்டு வா", 
                "en": "Bring jasmine flowers and come",
                "si": "මල්ලිගා මල් ගෙන එන්න"
              }, 
              "timestamp": 10.5 
            }
          ]
        }
      }, null, 2);
    }

    private static getStoryPlayerTemplate(): string {
      return JSON.stringify({
        "title": { 
          "ta": "கதைசொல்லி", 
          "en": "Story Player", 
          "si": "කතන්දර වාදකය" 
        },
        "instruction": { 
          "ta": "கதையைக் கேட்டு, படங்களைப் பாருங்கள்.", 
          "en": "Listen to the story and follow the scenes.", 
          "si": "කතාවට සවන් දී පින්තූර බලන්න." 
        },
        "storyData": {
          "title": { 
            "ta": "தாகமுள்ள காகம்", 
            "en": "The Thirsty Crow", 
            "si": "පිපාසිත කපුටා" 
          },
          "audioUrl": { 
            "ta": "/audio/ta/thirsty_crow.mp3",
            "en": "/audio/en/thirsty_crow.mp3",
            "si": "/audio/si/thirsty_crow.mp3"
          },
          "scenes": [
            {
              "imageUrl": "/images/crow_sees_pot.jpg",
              "content": {
                "ta": "ஒரு காகம் மிகவும் தாகமாக இருந்தது. அது தண்ணீரைத் தேடி எல்லா இடங்களிலும் பறந்தது.",
                "en": "A crow was very thirsty. It flew everywhere looking for water.",
                "si": "කපුටෙකුට මහත් පිපාසයක් ඇති විය. එය වතුර සොයා හැම තැනම පියාසර කළේය."
              },
              "timestamp": 0.5 
            },
            {
              "imageUrl": "/images/crow_finds_pebbles.jpg",
              "content": {
                "ta": "திடீரென்று, அது ஒரு பானையைக் கண்டது. ஆனால் பானையில் தண்ணீர் குறைவாகவே இருந்தது.",
                "en": "Suddenly, it saw a pot. But there was very little water in the pot.",
                "si": "හදිසියේම එයට මුට්ටියක් පෙනුණි. නමුත් මුට්ටියේ වතුර තිබුණේ අඩුවෙනි."
              },
              "timestamp": 8.2
            },
            {
              "imageUrl": "/images/crow_drops_pebbles.jpg",
              "content": {
                "ta": "காகம் யோசித்தது. அது அருகிலிருந்த கூழாங்கற்களை எடுத்து பானையில் போட்டது.",
                "en": "The crow thought. It picked up pebbles nearby and dropped them into the pot.",
                "si": "කපුටා කල්පනා කළේය. එය ළඟ තිබූ ගල් කැට ගෙන මුට්ටියට දැම්මේය."
              },
              "timestamp": 15.6
            },
            {
              "imageUrl": "/images/crow_drinks_water.jpg",
              "content": {
                "ta": "தண்ணீர் மட்டம் உயர்ந்தது. காகம் மகிழ்ச்சியுடன் தண்ணீரைக் குடித்தது.",
                "en": "The water level rose. The crow happily drank the water.",
                "si": "වතුර මට්ටම ඉහළට ආවේය. කපුටා සතුටින් වතුර බිව්වේය."
              },
              "timestamp": 23.0
            }
          ]
        }
      }, null, 2);
    }

    private static getPronunciationActivityTemplate(): string {
      return JSON.stringify({
        "title": { 
        "ta": "உச்சரிப்புப் பயிற்சி", 
        "en": "Pronunciation Practice", 
        "si": "උච්චාරණ පුහුණුව" 
        },
        "instruction": { 
          "ta": "கீழே உள்ள வார்த்தையைச் சரியாகச் சொல்லவும்.", 
          "en": "Pronounce the following word correctly.", 
          "si": "වචනය නිවැරදිව උච්චාරණය කරන්න." 
        },
        "task": {
          "taskId": "T2",
          "taskType": "pronunciation",
          "content": {
            "word": { 
              "ta": "வணக்கம்", 
              "en": "Hello", 
              "si": "ආයුබෝවන්" 
            },
            "audioUrl": null,
            "imageUrl": null
          },
          "userResponse": {
            "recordedAudio": null,
            "score": null
          }
        }
      }, null, 2);
    }

    private static getScrumbleActivityTemplate(): string {
      return JSON.stringify({
          "title": { 
          "ta": "வார்த்தைக் குழப்பம்", 
          "en": "Word Scramble", 
          "si": "වචන අවුල්" 
        },
        "instruction": { 
          "ta": "கீழே உள்ள எழுத்துக்களைப் பயன்படுத்தி சரியான வார்த்தையை உருவாக்குங்கள்.", 
          "en": "Arrange the tiles to form the correct word.", 
          "si": "නිවැරදි වචනය සෑදීමට අකුරු පෙළගස්වන්න." 
        },
        "taskData": {
          "taskId": "SC1",
          "type": "letters",
          "hint": {
            "hintText": { 
              "ta": "இது ஒரு பழம்", 
              "en": "It is a fruit", 
              "si": "මෙය පළතුරකි" 
            },
            "hintImageUrl": "/images/apple.png",
            "hintAudioUrl": {
              "ta": "/audio/ta/apple_hint.mp3",
              "en": "/audio/en/apple_hint.mp3",
              "si": "/audio/si/apple_hint.mp3"
            }
          },
          "scrambled": {
            "ta": ["ப்", "ஆ", "ள்", "பி"],
            "en": ["P", "A", "E", "L", "P"],
            "si": ["ප", "ැ", "ප", "ල"]
          },
          "answer": { 
            "ta": "ஆப்பிள்", 
            "en": "APPLE", 
            "si": "ඇපල්" 
          }
        }
      }, null, 2);
    }

    private static getTripleblastActivityTemplate(): string {
      return JSON.stringify({
      "activityId": "TB001",
        "title": {
          "en": "Triple Blast",
          "ta": "மூன்று பொருத்து",
          "si": "තුනක් ගලපන්න"
        },
        "instruction": {
          "en": "Match three identical items to blast them!",
          "ta": "ஒரே உள்ளடக்கத்தை மூன்றாக பொருத்தி அகற்றுங்கள்!",
          "si": "එකම අන්තර්ගත තුනක් ගලපන්න!"
        },
        "contentType": "word",
        "data": [
          // Answer Group G1: Apple
          { "id": "U1", "content": { "en": "Apple", "ta": "ஆப்பிள்", "si": "ඇපල්" } },
          { "id": "U2", "content": { "en": "Apple", "ta": "ஆப்பிள்", "si": "ඇපල්" } },
          { "id": "U3", "content": { "en": "Apple", "ta": "ஆப்பிள்", "si": "ඇපල්" } },

          // Answer Group G2: Banana
          { "id": "U4", "content": { "en": "Banana", "ta": "வாழைப்பழம்", "si": "කෙසෙල්" } },
          { "id": "U5", "content": { "en": "Banana", "ta": "வாழைப்பழம்", "si": "කෙසෙල්" } },
          { "id": "U6", "content": { "en": "Banana", "ta": "வாழைப்பழம்", "si": "කෙසෙල්" } },
          
          // Answer Group G3: Cat
          { "id": "U7", "content": { "en": "Cat", "ta": "பூனை", "si": "බළලා" } },
          { "id": "U8", "content": { "en": "Cat", "ta": "பூனை", "si": "බළලා" } },
          { "id": "U9", "content": { "en": "Cat", "ta": "பூனை", "si": "බළලා" } },

          // Answer Group G4: Car
          { "id": "U10", "content": { "en": "Car", "ta": "கார்", "si": "මෝටර් රථය" } },
          { "id": "U11", "content": { "en": "Car", "ta": "கார்", "si": "මෝටර් රථය" } },
          { "id": "U12", "content": { "en": "Car", "ta": "கார்", "si": "මෝටර් රථය" } }
        ],
        "answers": [
          // 💡 நீக்கப்பட வேண்டிய குழுக்களின் ID-கள்
          { "groupId": "G1", "tileIds": ["U1", "U2", "U3"] }, 
          { "groupId": "G2", "tileIds": ["U4", "U5", "U6"] },
          { "groupId": "G3", "tileIds": ["U7", "U8", "U9"] },
          { "groupId": "G4", "tileIds": ["U10", "U11", "U12"] }
        ]
      }, null, 2);
    }

    private static getBubbleblastActivityTemplate(): string {
      return JSON.stringify({
        "title": { 
        "ta": "பபிள் பிளாஸ்டர் - எழுத்துகள்", 
        "en": "Bubble Blaster - Letters", 
        "si": "බබල් බ්ලැස්ටර් - අකුරු" 
        },
        "instruction": { 
          "ta": "சுடப்படும் பபிளின் எழுத்தை நிலையான பபிளில் பொருந்தும் எழுத்துடன் பொருத்தவும்.", 
          "en": "Shoot the bubble that matches the letter in the fixed bubble to explode it.", 
          "si": "Fixed bubble එකේ අකුරට ගැළපෙන bubble එක shoot කරන්න."
        },
        "levelId": "L1",
        "contentType": "letter",

        "fixedBubbles": [
          { "id": "F1", "content": { "ta": "அ", "en": "A", "si": "අ" } },
          { "id": "F2", "content": { "ta": "இ", "en": "I", "si": "ඉ" } },
          { "id": "F3", "content": { "ta": "உ", "en": "U", "si": "උ" } },
          { "id": "F4", "content": { "ta": "எ", "en": "E", "si": "එ" } },
          { "id": "F5", "content": { "ta": "ஒ", "en": "O", "si": "ඔ" } }
        ],

        "shootableBubbles": [
          { "id": "S1", "content": { "ta": "அ", "en": "A", "si": "අ" } },
          { "id": "S2", "content": { "ta": "இ", "en": "I", "si": "ඉ" } },
          { "id": "S3", "content": { "ta": "உ", "en": "U", "si": "උ" } },
          { "id": "S4", "content": { "ta": "எ", "en": "E", "si": "එ" } },
          { "id": "S5", "content": { "ta": "ஒ", "en": "O", "si": "ඔ" } }
        ],

        "answerPairs": [
          { "shootableId": "S1", "fixedId": "F1" },
          { "shootableId": "S2", "fixedId": "F2" },
          { "shootableId": "S3", "fixedId": "F3" },
          { "shootableId": "S4", "fixedId": "F4" },
          { "shootableId": "S5", "fixedId": "F5" }
        ]
      }, null, 2);
    } 
    
    private static getmemorypairActivityTemplate(): string {
      return JSON.stringify({
        "title": { "ta": "சிறப்பு நினைவு விளையாட்டு", "en": "Memory Card Flip", "si": "මතක කාඩ් ප්ලிப்" },
        "instruction": { 
          "ta": "ஒத்த கார்டுகளை கண்டுபிடித்து கிளிக் செய்யவும்.", 
          "en": "Find matching cards by clicking them.", 
          "si": "ගැළපෙන කාඩ් සොයා ගන්න." 
        },
        "levelId": "L1",
        "cards": [
          { "id": "C1", "contentType": "word", "content": { "ta": "ஆப்பிள்", "en": "Apple", "si": "ඇපල්" } },
          { "id": "C2", "contentType": "image", "content": { "ta": "/images/ta/apple.png", "en": "/images/en/apple.png", "si": "/images/si/apple.png" } },
          { "id": "C3", "contentType": "word", "content": { "ta": "நாய்", "en": "Dog", "si": "බල්ලා" } },
          { "id": "C4", "contentType": "image", "content": { "ta": "/images/ta/dog.png", "en": "/images/en/dog.png", "si": "/images/si/dog.png" } }
        ],
        "answerPairs": [
          { "card1": "C1", "card2": "C2" },  // Word-Apple ↔ Image-Apple
          { "card1": "C3", "card2": "C4" }   // Word-Dog ↔ Image-Dog
        ]
      }, null, 2);
    }

    private static getgroupsorterActivityTemplate(): string {
      return JSON.stringify({
        "title": { "ta": "வார்த்தைகள் குழு", "en": "Word Group", "si": "වචන කණ්ඩායරය" },
        "instruction": {
          "ta": "பொருத்தமான வார்த்தைகளை குழுக்களில் இடவும்.",
          "en": "Place the words into the correct groups.",
          "si": "වචන නිවැරදි කණ්ඩායරවලට තබන්න."
        },
        "levelId": "L1",
        "contentType": "word",
        "groups": [
          { "groupId": "G1", "groupName": { "ta": "பழங்கள்", "en": "Fruits", "si": "පළතුරු" } },
          { "groupId": "G2", "groupName": { "ta": "விலங்குகள்", "en": "Animals", "si": "සතුන්" } }
        ],
        "items": [
          { "id": "I1", "content": { "ta": "ஆப்பிள்", "en": "Apple", "si": "ඇපල්" }, "groupId": "G1" },
          { "id": "I2", "content": { "ta": "வாழை", "en": "Banana", "si": "කෙසෙල්" }, "groupId": "G1" },
          { "id": "I3", "content": { "ta": "நாய்", "en": "Dog", "si": "බල්ලා" }, "groupId": "G2" },
          { "id": "I4", "content": { "ta": "பூனை", "en": "Cat", "si": "පූසා" }, "groupId": "G2" }
        ]
      }, null, 2);
    }
}
