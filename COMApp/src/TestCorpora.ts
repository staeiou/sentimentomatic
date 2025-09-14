export interface TestCorpus {
  name: string;
  description: string;
  template: string;
  labels: string[];
  texts: string[];
}

export const TEST_CORPORA: Record<string, TestCorpus> = {
  'sentiment-mixed': {
    name: 'Mixed Sentiment (25 cases)',
    description: 'Comprehensive sentiment test cases from our validation suite',
    template: 'This text is emotionally {}.',
    labels: ['positive', 'negative', 'neutral'],
    texts: [
      // Clearly Positive
      "I absolutely love this product! It's amazing and exceeded all my expectations!",
      "THIS IS SO SUPER COOL AND THE BEST EVER! YES!",
      "What a wonderful day! I'm feeling fantastic and everything is perfect.",
      "Brilliant work! Outstanding performance and incredible results.",
      "I'm thrilled with the outcome. Great job everyone!",

      // Clearly Negative
      "I hate hate HATE trying to write examples, it's not fun! I'm not happy!",
      "This is terrible, awful, and completely disappointing. Worst experience ever.",
      "Ugh, this is so frustrating and annoying. I can't stand it anymore!",
      "Complete waste of time and money. Horrible quality and poor service.",
      "I'm really disappointed and upset about this situation.",

      // Neutral/Factual
      "The weather today is 72 degrees Fahrenheit with partly cloudy skies.",
      "The meeting is scheduled for 3 PM in conference room B.",
      "Please submit your report by Friday at 5 PM.",
      "The company was founded in 1995 and has 500 employees.",
      "Each line will be analyzed independently and given scores by various models.",

      // Mixed/Complex
      "The product has some good features but also several major flaws.",
      "I'm happy about the promotion but sad to leave my current team.",
      "Great idea, but the execution could be better.",

      // Sarcasm/Irony (tricky cases)
      "Yeah, right.",
      "Sentiment analysis is the perfect and foolproof method for every research project ever --- NOT!",

      // Quotes/Literary
      "Darkness cannot drive out darkness; only light can do that. Hate cannot drive out hate; only love can do that.",
      "Although a double negative in English implies a positive meaning, there is no language in which a double positive implies a negative.",
      "There are three kinds of lies: lies, damned lies, and statistics.",

      // Internet/Slang
      "u can def analyze slang w/ vader, its gr8! text analysis ftw!",
      "😢😠😢"
    ]
  },

  'sentiment-focused': {
    name: 'Focused Sentiment (10 cases)',
    description: 'Concentrated test cases for neutral detection validation',
    template: 'This text is emotionally {}.',
    labels: ['positive', 'negative', 'neutral'],
    texts: [
      // Clearly Positive
      "I absolutely love this product! It's amazing!",
      "THIS IS SO SUPER COOL AND THE BEST EVER!",

      // Clearly Negative
      "I hate this! It's terrible and disappointing.",
      "This is awful and completely frustrating.",

      // Neutral/Factual (the problem cases)
      "The weather today is 72 degrees Fahrenheit.",
      "The meeting is scheduled for 3 PM in room B.",
      "Please submit your report by Friday at 5 PM.",
      "The company was founded in 1995 and has 500 employees.",

      // Mixed/Tricky
      "The product has good features but also major flaws.",
      "Yeah, right." // Sarcasm test
    ]
  },

  'topic-classification': {
    name: 'Topic Classification',
    description: 'Classify text by topic/domain',
    template: 'This text is about {}.',
    labels: ['politics', 'technology', 'sports', 'entertainment'],
    texts: [
      "The president announced new economic policies today.",
      "Apple released a new iPhone with advanced AI features.",
      "The basketball team won the championship last night.",
      "The new movie broke box office records this weekend.",
      "Congress is debating the new healthcare bill.",
      "Google's latest AI model shows impressive capabilities.",
      "The football season starts next month with high expectations.",
      "The streaming service announced several new shows.",
      "Election results show a close race in key swing states.",
      "Microsoft acquired a major cloud computing company."
    ]
  },

  'content-type': {
    name: 'Content Type Detection',
    description: 'Distinguish between factual, opinion, and question content',
    template: 'This text is {}.',
    labels: ['factual', 'opinion', 'question'],
    texts: [
      "Water boils at 100 degrees Celsius.",
      "I think this movie is the best ever made.",
      "What time does the meeting start?",
      "The company was founded in 1995.",
      "In my opinion, this approach works better.",
      "How do you solve this equation?",
      "The population of Tokyo is approximately 14 million.",
      "This restaurant serves amazing food.",
      "Where did you put the keys?",
      "The event happened on March 15th, 2023."
    ]
  },

  'spam-detection': {
    name: 'Spam Detection',
    description: 'Identify spam vs legitimate messages',
    template: 'This is a {} email.',
    labels: ['promotional spam', 'normal message'],
    texts: [
      "URGENT! You've won $1,000,000! Click here NOW!",
      "Your package has been delivered to your front door.",
      "Free money! No strings attached! Act now!",
      "Meeting reminder: Don't forget about our 2 PM call.",
      "LIMITED TIME OFFER! Buy now and save 90%!!!",
      "Your subscription renewal is due next week.",
      "CONGRATULATIONS! You're our lucky winner!",
      "The quarterly report is ready for review.",
      "CLICK HERE FOR INSTANT RICHES!!!",
      "Thanks for your payment. Receipt attached."
    ]
  },

  'communication-intent': {
    name: 'Communication Intent',
    description: 'Classify the purpose of communication',
    template: 'This text is meant to be {}.',
    labels: ['informative', 'persuasive', 'entertaining'],
    texts: [
      "Here are the step-by-step instructions for the process.",
      "You should definitely buy this product - it will change your life!",
      "Why did the chicken cross the road? To get to the other side!",
      "The meeting will be held at 3 PM in room 205.",
      "This amazing deal won't last long - order today!",
      "A man walks into a bar with jumper cables. The bartender says, 'I'll serve you, but don't start anything!'",
      "The temperature setting should be adjusted to 350°F.",
      "Don't miss out on this incredible opportunity!",
      "What do you call a bear with no teeth? A gummy bear!",
      "Please complete the form by the deadline."
    ]
  }
};

export function getTestCorpus(id: string): TestCorpus | undefined {
  return TEST_CORPORA[id];
}

export function getAllCorpusIds(): string[] {
  return Object.keys(TEST_CORPORA);
}