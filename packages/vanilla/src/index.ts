import { ApfelSequenceEngine } from '@apfel-sequence/core';
import type { ApfelSequenceProps } from '@apfel-sequence/core';

export default function ApfelSequence(options: ApfelSequenceProps) {
	return new ApfelSequenceEngine(options);
}
