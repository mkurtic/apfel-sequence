import { ScrollSequenceEngine } from "@scroll-sequence/core";
import type { ScrollSequenceProps } from "@scroll-sequence/core";

export default function ScrollSequence(options: ScrollSequenceProps) {
	return new ScrollSequenceEngine(options);
}
