// Configuration for interactive page elements (Audio, Video, Person Gallery)
import { PERSON_IMAGES } from "@/config/cloudinary";
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
    persons: PERSON_IMAGES.map((imageUrl, index) => ({ id: index + 1, imageUrl })),
  },
  page20: {
    audio: {
      title: "Page 20 Readout",
      subtitle: "Full audio reading of Page 20",
      src: "https://actions.google.com/sounds/v1/ambiences/daytime_forest_bonfire.ogg",
    },
  },
};
