use dep::aztec::{
    macros::notes::note,
    protocol_types::{
        address::AztecAddress,
        traits::Packable,
    },
    oracle::random::random,
};

#[derive(Eq, Packable)]
#[note]
pub struct NFTNote {
    owner: AztecAddress,
    randomness: Field,
    sub_id: Field,
}

impl NFTNote {
    pub fn new(owner: AztecAddress, sub_id: Field) -> Self {
        // The randomness preserves privacy by preventing brute-forcing
        NFTNote { owner, randomness: unsafe { random() }, sub_id }
    }
}