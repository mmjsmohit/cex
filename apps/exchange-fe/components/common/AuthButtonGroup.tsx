import { Button } from "../ui/button";

export default function AuthButtonGroup() {
  return (
    <div className="flex gap-1">
      <Button variant={"default"} size={"sm"}>
        Log In
      </Button>
      <Button variant={"default"} size={"sm"}>
        Sign Up
      </Button>
    </div>
  );
}
