// Configuration for interactive page elements (Audio, Video, Person Gallery)
import person1 from "@/assets/persons/person1.webp";
import person2 from "@/assets/persons/person2.webp";
import person3 from "@/assets/persons/person3.webp";
import person4 from "@/assets/persons/person4.webp";
import person5 from "@/assets/persons/person5.webp";
import person6 from "@/assets/persons/person6.webp";
import person7 from "@/assets/persons/person7.webp";
import person8 from "@/assets/persons/person8.webp";
import coverAudioUrl from "@/assets/coverpage.mp3";

export interface PersonItem {
  id: number;
  name?: string;
  role?: string;
  imageUrl: string;
  description?: string;
}

export interface PageInteractionsConfig {
  cover: {
    audio: {
      title: string;
      subtitle?: string;
      src: string;
    };
    video: {
      title: string;
      description?: string;
      url: string;
    };
  };
  page11: {
    modalTitle: string;
    modalSubtitle?: string;
    persons: PersonItem[];
  };
  page20: {
    audio: {
      title: string;
      subtitle?: string;
      src: string;
    };
  };
}

export const pageInteractions: PageInteractionsConfig = {
  cover: {
    audio: {
      title: "Cover Audio Presentation",
      subtitle: "Introduction to Homeopathy Bangladesh",
      src: coverAudioUrl,
    },
    video: {
      title: "Featured Video Presentation",
      description: "Watch the introductory documentary and presentation.",
      url: "https://youtu.be/81qmd1dr-Oc",
    },
  },
  page11: {
    modalTitle: "হোমিওপ্যাথি নিয়ে মনীষীদের অভিব্যক্তি",
    modalSubtitle: "হোমিওপ্যাথি সম্পর্কে বিশ্ববরেণ্য মনীষীদের মূল্যবান মতামত ও বক্তব্য",
    persons: [
      { id: 1, imageUrl: person1 },
      { id: 2, imageUrl: person2 },
      { id: 3, imageUrl: person3 },
      { id: 4, imageUrl: person4 },
      { id: 5, imageUrl: person5 },
      { id: 6, imageUrl: person6 },
      { id: 7, imageUrl: person7 },
      { id: 8, imageUrl: person8 },
    ],
  },
  page20: {
    audio: {
      title: "Page 20 Readout",
      subtitle: "Full audio reading of Page 20",
      src: "https://actions.google.com/sounds/v1/ambiences/daytime_forest_bonfire.ogg",
    },
  },
};
