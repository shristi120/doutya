import { Montserrat } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin"] });

export const metadata = {
  title: "Xortlist | Craft Your Career with Xortlist!",
  description: "Xortlist is an innovative AI-powered career guidance platform designed to help individuals discover their ideal career paths. By analyzing users' personality traits and interests through detailed assessments, Xortlist provides tailored career suggestions across a spectrum of options. The platform features personalized roadmaps that guide users step-by-step through their career journey, ensuring they achieve their goals with constant feedback, milestone tracking, and engaging challenges. With Xortlist, you can confidently explore, plan, and embark on a fulfilling career journey.",
};

export default async function RootLayout({ children }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${montserrat.className} bg-[url('https://i.postimg.cc/2SGmwV5P/artistic-blurry-colorful-wallpaper-background-58702-8553.jpg')] bg-cover bg-center bg-no-repeat min-h-screen`}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
