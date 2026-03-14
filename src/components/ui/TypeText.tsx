import { TypeAnimation } from "react-type-animation";

interface Props {
  text: string;
}

export default function TypeText({ text }: Props) {
  return (
    <TypeAnimation
      sequence={[text]}
      wrapper="span"
      speed={50}
      cursor={true}
      repeat={0}
      style={{ display: "inline-block" }}
    />
  );
}