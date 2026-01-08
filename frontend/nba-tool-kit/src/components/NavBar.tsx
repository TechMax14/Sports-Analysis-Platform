import { HStack, Image, Text, Spacer } from "@chakra-ui/react";
import ColorModeSwitch from "./ColorModeSwitch";
import logo from "../assets/logo.png"; // adjust path as needed

const NavBar = () => {
  return (
    <HStack padding="10px">
      {/* Left section: logo + text */}
      <HStack spacing={4}>
        <Image src={logo} boxSize="60px" borderRadius="md" />
        <Text
          fontSize="2xl"
          fontWeight="bold"
          fontFamily="heading"
          color="teal.500"
        >
          NBA Analysis Tool
        </Text>
      </HStack>

      {/* Spacer pushes the toggle to the far right */}
      <Spacer />

      {/* Right section: color mode toggle */}
      <ColorModeSwitch />
    </HStack>
  );
};

export default NavBar;
