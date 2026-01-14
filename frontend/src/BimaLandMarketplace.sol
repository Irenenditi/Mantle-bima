// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract BimaLandMarketplace is ERC721, Ownable, ReentrancyGuard {
    uint256 public nextTokenId;

    constructor() ERC721("BIMA Land Title", "BIMA") {}

    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/

    struct Land {
        address seller;
        string metadataURI; // IPFS CID
        uint256 price;
        bool verified;
        bool sold;
        uint8 approvals;
    }

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    mapping(uint256 => Land) public lands;
    mapping(uint256 => mapping(address => bool)) public approvedBy;
    mapping(address => bool) public inspectors;
    mapping(address => uint256) public inspectorReputation;
    mapping(uint256 => string) private _tokenURIs;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event InspectorAdded(address inspector);
    event LandListed(uint256 indexed landId, address indexed seller);
    event LandApproved(uint256 indexed landId, address indexed inspector);
    event LandVerified(uint256 indexed landId);
    event LandPurchased(
        uint256 indexed landId,
        address indexed buyer,
        uint256 tokenId
    );

    /*//////////////////////////////////////////////////////////////
                                MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyInspector() {
        require(inspectors[msg.sender], "Not inspector");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                        INSPECTOR MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    function addInspector(address inspector) external onlyOwner {
        inspectors[inspector] = true;
        emit InspectorAdded(inspector);
    }

    /*//////////////////////////////////////////////////////////////
                            LAND LISTING
    //////////////////////////////////////////////////////////////*/

    function listLand(
        string calldata metadataURI,
        uint256 price
    ) external returns (uint256 landId) {
        require(price > 0, "Invalid price");

        landId = nextTokenId;

        lands[landId] = Land({
            seller: msg.sender,
            metadataURI: metadataURI,
            price: price,
            verified: false,
            sold: false,
            approvals: 0
        });

        emit LandListed(landId, msg.sender);
    }

    /*//////////////////////////////////////////////////////////////
                    MULTI-SIG INSPECTOR VERIFICATION
    //////////////////////////////////////////////////////////////*/

    function approveLand(uint256 landId) external onlyInspector {
        Land storage land = lands[landId];

        require(!land.verified, "Already verified");
        require(!approvedBy[landId][msg.sender], "Already approved");

        approvedBy[landId][msg.sender] = true;
        land.approvals++;

        inspectorReputation[msg.sender]++;

        emit LandApproved(landId, msg.sender);

        if (land.approvals >= 2) {
            land.verified = true;
            emit LandVerified(landId);
        }
    }

    /*//////////////////////////////////////////////////////////////
                        PURCHASE + ESCROW
    //////////////////////////////////////////////////////////////*/

    function purchaseLand(uint256 landId)
        external
        payable
        nonReentrant
    {
        Land storage land = lands[landId];

        require(land.verified, "Not verified");
        require(!land.sold, "Already sold");
        require(msg.value == land.price, "Wrong payment");

        land.sold = true;

        uint256 tokenId = nextTokenId;
        nextTokenId++;

        _safeMint(msg.sender, tokenId);
        _tokenURIs[tokenId] = land.metadataURI;

        payable(land.seller).transfer(msg.value);

        emit LandPurchased(landId, msg.sender, tokenId);
    }

    /*//////////////////////////////////////////////////////////////
                            TOKEN URI
    //////////////////////////////////////////////////////////////*/

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(_exists(tokenId), "Nonexistent token");
        return _tokenURIs[tokenId];
    }
}