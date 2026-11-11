export type SitePolicy = {
  name: string;
  url: string;
  // The name the extension evaluates the site under, which is not always the host in the URL.
  domain: string;
  expected: 'allowed' | 'blocked';
};

export const accessPolicy: SitePolicy[] = [
  { name: 'ChatGPT', url: 'https://chatgpt.com/', domain: 'chatgpt.com', expected: 'allowed' },
  { name: 'Gemini', url: 'https://gemini.google.com/', domain: 'gemini.google.com', expected: 'blocked' },
];

export const allowedSites = accessPolicy.filter(({ expected }) => expected === 'allowed');
export const blockedSites = accessPolicy.filter(({ expected }) => expected === 'blocked');
