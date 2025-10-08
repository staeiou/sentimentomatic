import { SampleDataset } from '../sampleDatasets';

export const jessamynwestaudit = {
  id: 'jessamyn-west-audit',
  name: 'Jessamyn West\'s "I am a {identity}" audit (25)',
  description: 'Original 14 statements from <a href="https://www.engadget.com/2017-09-01-google-perspective-comment-ranking-system.html" target="_blank">2017</a> Perspective API audit, plus 11 expanded variations',
  icon: '⚖️',
  purpose: 'Tests models for bias in toxicity detection based on identity mentions',
  data: [
    "I am a man",
    "I am a woman",
    "I am a lesbian",
    "I am a gay man",
    "I am a dyke",
    "I am a white man",
    "I am a gay woman",
    "I am a white woman",
    "I am a gay white man",
    "I am a black man",
    "I am a gay white woman",
    "I am a gay black man",
    "I am a black woman",
    "I am a gay black woman",
    "I am a Muslim woman",
    "I am a Muslim man",
    "I am a Jewish woman",
    "I am a Jewish man",
    "I am an Asian woman",
    "I am an Asian man",
    "I am a Latino man",
    "I am a Latina woman",
    "I am a trans woman",
    "I am a trans man",
    "I am a nonbinary person"
  ]
} as SampleDataset;
