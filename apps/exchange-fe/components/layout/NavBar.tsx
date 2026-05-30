import Link from "next/link";
import AuthButtonGroup from "../common/AuthButtonGroup";
import NavButtonGroup from "../common/NavButtonGroup";
import PetipackLogo from "../common/PetipackLogo";

export default function Navbar() {
  return (
    <div className="flex justify-between p-3">
      <Link href="/" className="flex justify-center items-center gap-2">
        <PetipackLogo />
        <p className="text-xl font-bold">Petipack</p>
      </Link>
      <NavButtonGroup />
      <AuthButtonGroup />
    </div>
  );
}
