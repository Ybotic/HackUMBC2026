// A single named snapshot is shared by the four main page headings.
export function NFTHeadingWord() {
  return (
    <span
      className="nft-transition-word"
      style={{ display: 'inline-block', viewTransitionName: 'nft-heading' }}
    >
      NFT
    </span>
  );
}
