import Link from "next/link";
import { Button } from "../ui/button";

export default function NavButton({
  text,
  navLink,
}: {
  text: string;
  navLink: string;
}) {
  return (
    <Link href={navLink}>
      <Button variant={"ghost"} size={"sm"}>
        {text}
      </Button>
    </Link>
  );
}
