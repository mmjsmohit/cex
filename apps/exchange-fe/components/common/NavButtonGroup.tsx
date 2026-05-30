import { LINKS } from "@/lib/constants";
import NavButton from "./NavButton";
export default function NavButtonGroup() {
  return (
    <div>
      {LINKS.map((link) => (
        <NavButton key={link.text} text={link.text} navLink={link.navLink} />
      ))}
    </div>
  );
}
