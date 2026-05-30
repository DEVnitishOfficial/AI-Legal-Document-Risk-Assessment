export const highlightText = (text: string, keywords: string[]) => {
  let highlighted = text;

  keywords.forEach((word) => {
    const regex = new RegExp(`(${word})`, "gi");
    highlighted = highlighted.replace(
      regex,
      `<span class="bg-yellow-500 text-black">$1</span>`
    );
  });

  return highlighted;
};
